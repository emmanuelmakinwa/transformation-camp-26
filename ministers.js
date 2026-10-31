const ministers = Array.from({ length: 4 }, (_, index) => ({
  number: String(index + 1).padStart(2, '0'),
  name: index === 0 ? 'Emmanuel Makinwa' : index === 2 ? 'Precious Ebine' : 'Minister name',
  bio: 'Bio........',
  image: index === 0 ? 'assets/minister-emmanuel-makinwa.jpg' : index === 2 ? 'assets/minister-precious-ebine.jpg' : null,
}));
const list = document.querySelector('#minister-list');

list.innerHTML = ministers.map((minister, index) => `<article class="minister-profile minister-profile-${index + 1}">
  <div class="minister-profile-art"${minister.image ? '' : ' aria-hidden="true"'}>${minister.image ? `<img src="${minister.image}" alt="Minister ${minister.number}: ${minister.name}" loading="lazy">` : `<span class="minister-profile-number">${minister.number}</span><span class="minister-avatar"><svg viewBox="0 0 64 64" focusable="false"><circle cx="32" cy="22" r="11"/><path d="M11 58c1.5-13 9-20 21-20s19.5 7 21 20"/></svg></span><span class="minister-art-ring"></span>`}</div>
  <div class="minister-profile-copy"><h2>${minister.name}</h2><p>${minister.bio}</p></div>
</article>`).join('');
