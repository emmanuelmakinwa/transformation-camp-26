const ministers = Array.from({ length: 4 }, (_, index) => ({ number: String(index + 1).padStart(2, '0') }));
const list = document.querySelector('#minister-list');

list.innerHTML = ministers.map((minister, index) => `<article class="minister-profile minister-profile-${index + 1}">
  <div class="minister-profile-art" aria-hidden="true"><span class="minister-profile-number">${minister.number}</span><span class="minister-avatar"><svg viewBox="0 0 64 64" focusable="false"><circle cx="32" cy="22" r="11"/><path d="M11 58c1.5-13 9-20 21-20s19.5 7 21 20"/></svg></span><span class="minister-art-ring"></span></div>
  <div class="minister-profile-copy"><h2>Minister name</h2><p>Bio........</p></div>
</article>`).join('');
