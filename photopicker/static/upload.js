(function() {
'use strict';

app.File = Backbone.Model.extend({

    constructor: function(domFile) {
        Backbone.Model.apply(this, []);
        this.domFile = domFile;
        this.set({
            'name': domFile.name,
            'size': domFile.size,
            'state': 'queued'
        });
    },

    upload: function(url, callback) {
        this.set('state', 'uploading');
        var formData = new FormData();
        formData.append("file", this.domFile);
        $.ajax({
            url: url,
            type: "POST",
            data: formData,
            processData: false,
            contentType: false,
            success: _.bind(function(response) {
                this.set('state', 'done');
                callback(null);
            }, this),
            error: _.bind(function(jqXHR, textStatus, errorMessage) {
                this.set('state', 'failed');
                callback('upload failed');
            }, this)
        });
    }

});


app.Uploader = Backbone.View.extend({

    events: {
        'dragover': 'on_dragover',
        'drop': 'on_drop'
    },

    initialize: function(options) {
        this.uploadUrl = options.uploadUrl;
        this.collection = new Backbone.Collection();
        this.statusView = new app.UploadStatus({collection: this.collection});
        this.$el.append(this.statusView.el);
        this.busy = false;
    },

    on_dragover: function(evt) {
        evt.preventDefault();
    },

    on_drop: function(evt) {
        evt.preventDefault();
        var dataTransfer = evt.originalEvent.dataTransfer;
        _.forEach(dataTransfer.files, function(domFile) {
            var file = new app.File(domFile);
            this.collection.add(file);
        }, this);

        if(! this.busy) {
            this.uploadNext();
        }
    },

    uploadNext: function() {
        var file = this.collection.findWhere({state: 'queued'});
        if(! file) { return; }
        this.busy = true;

        file.upload(this.uploadUrl, _.bind(function(err) {
            this.busy = false;
            this.render();
            if(! err) {
                this.uploadNext();
            }
        }, this));
    }

});


app.UploadStatus = Backbone.View.extend({

    initialize: function() {
        this.collection.on('add remove change', _.bind(this.render, this));
        this.render();
    },

    render: function() {
        var bytesTotal = 0, bytesDone = 0;
        this.collection.forEach(function(file) {
            var size = file.get('size');
            bytesTotal += size;
            if(file.get('state') == 'done') {
                bytesDone += size;
            }
        });

        var percent = 0;
        if(bytesTotal > 0) {
            percent = Math.round(100 * bytesDone / bytesTotal);
        }

        this.$el.html(
            "uploading " + this.collection.length + " files: " + percent + "%"
        );
    }

});

})();
