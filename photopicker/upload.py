import flask


upload = flask.Blueprint('upload', __name__)


@upload.route('/upload')
def upload_page():
    return flask.render_template('upload.html')
