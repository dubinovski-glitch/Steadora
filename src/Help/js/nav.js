// Highlight the active nav link based on current page filename.
(function () {
  var page = window.location.pathname.split('/').pop() || 'index.html';
  if (page === '') page = 'index.html';
  document.querySelectorAll('.nl').forEach(function (a) {
    if (a.getAttribute('href') === page) a.classList.add('active');
  });
})();
