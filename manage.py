#!/usr/bin/env python

from photopicker.app import create_app, create_manager

app = create_app()

if __name__ == '__main__':
    manager = create_manager(app)
    manager.run()
