import flask
from flask.ext.script import Manager
from photopicker import upload


common = flask.Blueprint('common', __name__)


@common.route('/_ping')
def ping():
    return 'ok'


def create_app():
    app = flask.Flask(__name__)
    app.register_blueprint(common)
    app.register_blueprint(upload.upload)
    return app


def create_manager(app):
    manager = Manager(app)
    return manager
