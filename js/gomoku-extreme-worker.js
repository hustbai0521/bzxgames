/* Keep the expensive search off the browser's UI thread. */
importScripts("gomoku-extreme.js?v=4");
self.onmessage = function (event) {
  const request = event.data;
  try {
    const move = self.GomokuExtreme.chooseMove(request.board, request.player);
    self.postMessage({ id: request.id, move: move });
  } catch (error) {
    self.postMessage({ id: request.id, error: String(error && error.message || error) });
  }
};
