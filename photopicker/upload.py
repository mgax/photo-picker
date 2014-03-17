import tempfile
import errno
import hashlib
from pathlib import Path
import flask
from werkzeug.wsgi import FileWrapper
from photopicker import models


upload = flask.Blueprint('upload', __name__)


@upload.record
def create_storage(state):
    app = state.app
    container = Path(app.config['STORAGE_PATH'])
    app.extensions['storage'] = FileStorage(container)


@upload.route('/')
def home():
    return flask.render_template('home.html', **{
        'album_list': models.Album.query.all(),
    })


@upload.route('/upload/create_album', methods=['POST'])
def create_album():
    album = models.Album()
    models.db.session.add(album)
    models.db.session.commit()
    return flask.redirect(flask.url_for('.album', album_id=album.id))


@upload.route('/album/<album_id>')
def album(album_id):
    album = models.Album.query.get_or_404(album_id)
    return flask.render_template('album.html', **{
        'album': album,
    })


@upload.route('/upload/save/<album_id>', methods=['POST'])
def save(album_id):
    album = models.Album.query.get_or_404(album_id)
    request_file = flask.request.files['photo']
    storage = flask.current_app.extensions['storage']
    key = storage.create(request_file)
    photo = models.Photo(album=album, name=request_file.name, storage_key=key)
    models.db.session.commit()
    return flask.jsonify(success=True, photo={'id': photo.id})


def _ensure(p, parents=True):
    try:
        p.mkdir(parents=parents)

    except OSError as e:
        if e.errno != errno.EEXIST:
            raise


class FileStorage(object):

    create_hash = hashlib.sha1

    def __init__(self, container):
        self.container = Path(container)

    @property
    def tmp(self):
        return self.container / 'tmp'

    def get_path(self, key):
        return self.container / key[:2] / key[2:]

    def create(self, f):
        _ensure(self.container, parents=True)
        _ensure(self.tmp, parents=True)
        hash = self.create_hash()
        temp_file = tempfile.NamedTemporaryFile(
            dir=str(self.tmp),
            delete=False,
        )
        temp_file_path = Path(temp_file.name)

        try:
            with temp_file as tf:
                for chunk in FileWrapper(f):
                    hash.update(chunk)
                    tf.write(chunk)

            key = hash.hexdigest()
            path = self.get_path(key)

            _ensure(path.parent)

        except:
            temp_file_path.unlink()

        else:
            temp_file_path.rename(path)

        return key

    def open(self, key):
        return self.get_path(key).open('rb')
