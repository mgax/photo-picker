import flask
from flask.ext.script import Manager
from pathlib import Path
from photopicker import upload
from photopicker import models


common = flask.Blueprint('common', __name__)


@common.route('/_ping')
def ping():
    return 'ok'


@common.app_url_defaults
def bust_cache(endpoint, values):
    if endpoint == 'static':
        filename = values['filename']
        file_path = Path(flask.current_app.static_folder) / filename
        if file_path.exists():
            mtime = file_path.stat().st_mtime
            key = ('%x' % mtime)[-6:]
            values['t'] = key


def create_app():
    app = flask.Flask(__name__, instance_relative_config=True)
    app.config.from_pyfile('settings.py', silent=True)
    models.db.init_app(app)
    app.register_blueprint(common)
    app.register_blueprint(upload.upload)

    if app.config.get('SENTRY_DSN'):
        from raven.contrib.flask import Sentry
        Sentry(app)

    return app


def create_manager(app):
    manager = Manager(app)
    manager.add_command('db', models.db_manager)
    manager.add_command('photo', upload.photo_manager)
    return manager
