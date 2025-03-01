from flask import Flask, send_from_directory

import os

app = Flask(__name__, static_folder='static')

@app.route('/play')
def play():
    return send_from_directory(app.static_folder, 'index.html')


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))  # Use PORT from environment or default to 5000
    app.run(host='0.0.0.0', port=port, debug=True)


