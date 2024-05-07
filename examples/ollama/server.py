from flask import Flask, request, jsonify
from sentence_transformers import SentenceTransformer
import argparse

app = Flask(__name__)

# Set up command-line argument parsing
parser = argparse.ArgumentParser(description='Run a Flask server for embedding texts with Sentence Transformers.')
parser.add_argument('--model', type=str, default='all-MiniLM-L6-v2',
                    help='Model name for Sentence Transformers (default: all-MiniLM-L6-v2)')
parser.add_argument('--port', type=int, default=5000,
                    help='Port number for the Flask server (default: 5000)')
args = parser.parse_args()

# Initialize the model based on the command-line argument
model = SentenceTransformer(args.model)

@app.route('/embed', methods=['POST'])
def embed():
    texts = request.json['texts']
    embeddings = model.encode(texts, convert_to_tensor=False, convert_to_numpy=True)
    return jsonify(embeddings.tolist())

if __name__ == '__main__':
    app.run(port=args.port)
