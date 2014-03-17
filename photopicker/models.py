import uuid
from flask.ext.sqlalchemy import SQLAlchemy
from flask.ext.script import Manager


db = SQLAlchemy()


def generate_uuid():
    return str(uuid.uuid4())


class Album(db.Model):

    id = db.Column(db.String, primary_key=True, default=generate_uuid)


class Photo(db.Model):

    id = db.Column(db.String, primary_key=True, default=generate_uuid)
    album_id = db.Column(db.ForeignKey(Album.id))
    storage_key = db.Column(db.String)

    album = db.relationship(Album, backref='photos')

    def as_dict(self):
        return {
            'id': self.id,
        }


db_manager = Manager()


@db_manager.command
def sync():
    db.create_all()
