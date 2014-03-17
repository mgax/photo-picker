(function() {
'use strict';

app.Photo = Backbone.Model.extend({

    getThumbnailUrl: function() {
        return '/thumbnail/' + this.get('id');
    }

});


app.PhotoUploader = app.Photo.extend({

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
        formData.append("photo", this.domFile);
        $.ajax({
            url: url,
            type: "POST",
            data: formData,
            processData: false,
            contentType: false,
            success: _.bind(function(response) {
                this.set('state', 'done');
                this.set('id', response.photo.id);
                callback(null);
            }, this),
            error: _.bind(function(jqXHR, textStatus, errorMessage) {
                this.set('state', 'failed');
                callback('upload failed');
            }, this)
        });
    }

});


app.PhotoCollection = Backbone.Collection.extend({

    model:app.Photo

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
            var photo = new app.PhotoUploader(domFile);
            this.collection.add(photo);
        }, this);

        if(! this.busy) {
            this.uploadNext();
        }
    },

    uploadNext: function() {
        var photo = this.collection.findWhere({state: 'queued'});
        if(! photo) { return; }
        this.busy = true;

        photo.upload(this.uploadUrl, _.bind(function(err) {
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
        this.collection.forEach(function(photo) {
            var size = photo.get('size');
            bytesTotal += size;
            if(photo.get('state') == 'done') {
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


app.PhotoList = Backbone.View.extend({

    tagName: 'ul',
    className: 'photolist',

    initialize: function() {
        this.render();
    },

    render: function() {
        this.$el.empty();
        this.collection.forEach(function(photo) {
            var li = $('<li>');
            var img = $('<img>').attr('src', photo.getThumbnailUrl());
            li.append(img);
            this.$el.append(li);
        }, this);
    }

});


})();
