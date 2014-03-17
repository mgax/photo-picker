import flask


upload = flask.Blueprint('upload', __name__)


@upload.route('/upload')
def upload_page():
    return flask.render_template('upload.html')


@upload.route('/upload/save', methods=['POST'])
def save():
    print flask.request.files
    return flask.jsonify(success=True)
