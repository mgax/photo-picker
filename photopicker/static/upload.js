(function() {
'use strict';

app.Uploader = Backbone.View.extend({

    events: {
        'dragover': 'on_dragover',
        'drop': 'on_drop'
    },

    initialize: function() {
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
        _.forEach(dataTransfer.files, function(file) {
            this.collection.add(
                new Backbone.Model({
                    'name': file.name,
                    'size': file.size,
                    'file': file
                })
            );
        }, this);
    }

});


app.UploadStatus = Backbone.View.extend({

    initialize: function() {
        this.collection.on('add remove change', _.bind(this.render, this));
        this.render();
    },

    render: function() {
        this.$el.html("uploading (" + this.collection.length + " files)");
    }

});


app.create_uploader = function(el) {
    return new app.Uploader({el: el});
};

})();
