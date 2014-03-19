import tempfile
import errno
import hashlib
import subprocess
from pathlib import Path
import flask
from flask.ext.script import Manager
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
        'photo_list': [photo.as_dict() for photo in album.photos],
    })


def generate_thumbnail(photo):
    storage = flask.current_app.extensions['storage']

    with storage.open(photo.storage_key) as fp:
        process = subprocess.Popen(
            [
                'convert',
                '-define', 'jpeg:size=400x400',
                'jpeg:-',
                '-auto-orient',
                '-thumbnail', '256x256',
                'jpeg:-',
            ],
            stdin=fp,
            stdout=subprocess.PIPE,
        )
        photo.thumbnail_storage_key = storage.create(process.stdout)
        process.wait()


@upload.route('/upload/save/<album_id>', methods=['POST'])
def save(album_id):
    album = models.Album.query.get_or_404(album_id)
    request_file = flask.request.files['photo']
    storage = flask.current_app.extensions['storage']
    key = storage.create(request_file)

    photo = models.Photo(
        album=album,
        name=request_file.filename,
        storage_key=key,
    )
    models.db.session.commit()

    generate_thumbnail(photo)
    models.db.session.commit()

    return flask.jsonify(success=True, photo={'id': photo.id})


@upload.route('/thumbnail/<photo_id>')
def thumbnail(photo_id):
    photo = models.Photo.query.get_or_404(photo_id)
    storage = flask.current_app.extensions['storage']
    fp = storage.open(photo.thumbnail_storage_key)
    return flask.send_file(fp, mimetype='image/jpeg')


@upload.route('/download/<photo_id>')
def download(photo_id):
    photo = models.Photo.query.get_or_404(photo_id)
    storage = flask.current_app.extensions['storage']
    fp = storage.open(photo.storage_key)
    return flask.send_file(
        fp,
        mimetype='image/jpeg',
        as_attachment=True,
        attachment_filename=photo.name,
    )


photo_manager = Manager()


@photo_manager.command
def thumbnails():
    for photo in models.Photo.query:
        generate_thumbnail(photo)
        models.db.session.commit()


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
        return self.container / str(key[:2]) / str(key[2:])

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
