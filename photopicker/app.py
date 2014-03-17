import flask
from flask.ext.script import Manager
from photopicker import upload
from photopicker import models


common = flask.Blueprint('common', __name__)


@common.route('/_ping')
def ping():
    return 'ok'


def create_app():
    app = flask.Flask(__name__, instance_relative_config=True)
    app.config.from_pyfile('settings.py', silent=True)
    models.db.init_app(app)
    app.register_blueprint(common)
    app.register_blueprint(upload.upload)
    return app


def create_manager(app):
    manager = Manager(app)
    manager.add_command('db', models.db_manager)
    return manager
