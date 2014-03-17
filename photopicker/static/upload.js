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

    upload: function(url) {
        var formData = new FormData();
        formData.append("file", this.domFile);
        $.ajax({
            url: url,
            type: "POST",
            data: formData,
            processData: false,
            contentType: false,
            success: function(response) {
                console.log('upload success');
            },
            error: function(jqXHR, textStatus, errorMessage) {
                console.log('upload failed');
            }
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

        this.uploadNext();
    },

    uploadNext: function() {
        var file = this.collection.findWhere({state: 'queued'});
        if(! file) { return; }
        file.upload(this.uploadUrl);
    }

});


app.UploadStatus = Backbone.View.extend({

    initialize: function() {
        this.collection.on('add remove change', _.bind(this.render, this));
        this.render();
    },

    render: function() {
        var byteCount = this.collection.reduce(
            function(sum, f) { return sum + f.get('size'); }, 0);
        this.$el.html(
            "uploading " + this.collection.length + " files " +
            "(" + byteCount + " bytes)"
        );
    }

});

})();
