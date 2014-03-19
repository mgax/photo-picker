(function() {
'use strict';

app.Photo = Backbone.Model.extend({

    getThumbnailUrl: function() {
        return '/thumbnail/' + this.get('id');
    },

    getDownloadUrl: function() {
        return '/download/' + this.get('id');
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
                this.trigger('uploadFinished', photo);
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


app.PhotoPreviewModal = Backbone.View.extend({

    events: {
        'hidden.bs.modal': 'remove',
        'click': 'on_click'
    },

    initialize: function() {
        this.render();
        this.$el.modal();
    },

    render: function() {
        this.$el.attr('tabindex', "-1");
        this.$el.attr('class', 'modal fade');
        this.$el.html(
            '<div class="modal-dialog">\n' +
            '  <div class="modal-content">\n' +
            '    <div class="modal-header">\n' +
            '      <button type="button" class="close" ' +
                          'data-dismiss="modal" ' +
                          'aria-hidden="true">&times;</button>\n' +
            '      <h4 class="modal-title"></h4>\n' +
            '    </div>\n' +
            '    <div class="modal-body">\n' +
            '    </div>\n' +
            '    <div class="modal-footer">\n' +
            '    </div>\n' +
            '  </div>\n' +
            '</div>\n'
        );
        var url = this.model.getDownloadUrl();
        var img = $('<img class="photo-preview-img">').attr('src', url);
        this.$el.find('.modal-body').append(img);
        this.$el.find('.modal-title').text(this.model.get('name'));
    },

    on_click: function(evt) {
        this.$el.modal('hide');
    }

});


app.PhotoView = Backbone.View.extend({

    tagName: 'li',
    className: 'photo',

    events: {
        'click .photo-download': 'on_click_download',
        'click img': 'on_click_preview'
    },

    initialize: function() {
        this.render();
    },

    render: function() {
        var img = $('<img>').attr('src', this.model.getThumbnailUrl());
        var download = $('<a>download</a>');
        download.attr('class', 'photo-download btn btn-default');
        this.$el.append(img, download);
    },

    on_click_download: function(evt) {
        evt.preventDefault();
        ga('send', 'event', 'photo', 'download');
        var url = this.model.getDownloadUrl();
        window.location.href = url;
    },

    on_click_preview: function(evt) {
        evt.preventDefault();
        ga('send', 'event', 'photo', 'preview');
        new app.PhotoPreviewModal({model: this.model});
    }

});


app.PhotoList = Backbone.View.extend({

    tagName: 'ul',
    className: 'photolist',

    initialize: function() {
        this.viewMap = {};
        this.render();
        this.collection.on('add remove change', _.bind(this.render, this));
    },

    render: function() {
        this.$el.empty();

        this.collection.forEach(function(photo) {
            var photoView = this.viewMap[photo.cid];
            if(! photoView) {
                photoView = new app.PhotoView({model: photo})
                this.viewMap[photo.cid] = photoView;
            }

            this.$el.append(photoView.el);
            photoView.delegateEvents();
        }, this);
    }

});


})();
