(function() {
'use strict';

app.Uploader = Backbone.View.extend({

    events: {
        'dragover': 'on_dragover',
        'drop': 'on_drop'
    },

    on_dragover: function(evt) {
        evt.preventDefault();
    },

    on_drop: function(evt) {
        evt.preventDefault();
        var dataTransfer = evt.originalEvent.dataTransfer;
        _.forEach(dataTransfer.files, function(file) {
            console.log('upload', file.name, file.size);
        });
    }

});


app.create_uploader = function(el) {
    return new app.Uploader({el: el});
};

})();
