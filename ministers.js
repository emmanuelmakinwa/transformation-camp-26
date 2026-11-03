const ministers = Array.from({ length: 4 }, (_, index) => ({
  number: String(index + 1).padStart(2, '0'),
  name: index === 0 ? 'Pst. Emmanuel Makinwa' : index === 1 ? 'Pst. Jedidiah Olawale' : index === 2 ? 'Mins. Precious Ebine' : index === 3 ? 'Mins. Emmanuel Mujoh' : 'Minister name',
  bio: index === 2
    ? `<p>Mins. Precious Ebine is a lover of God, a worshipper, and a songwriter.</p>
       <p>With a mission to raise people who will fulfil their God-given potential to the fullest, she carries a mantra that speaks of the faithfulness of God: <em>God Can Be Trusted.</em></p>
       <p>She has also released two songs, <em>Trust</em> and <em>He Lives in Me</em>, which have blessed many lives and reassured listeners of God's unfailing faithfulness.</p>
       <p>She currently serves as the Regional Vice President (Admin) of Region 36 and the President of LP 94. She previously served as the Assistant Music Director of RCF UNILAG.</p>`
    : 'Bio........',
  image: index === 0 ? 'assets/minister-emmanuel-makinwa.jpg' : index === 1 ? 'assets/minister-jedidiah-olwale.jpg' : index === 2 ? 'assets/minister-precious-ebine.jpg' : index === 3 ? 'assets/minister-emmanuel-mujoh.jpg' : null,
}));
const list = document.querySelector('#minister-list');

list.innerHTML = ministers.map((minister, index) => `<article class="minister-profile minister-profile-${index + 1}">
  <div class="minister-profile-art"${minister.image ? '' : ' aria-hidden="true"'}>${minister.image ? `<img src="${minister.image}" alt="Minister ${minister.number}: ${minister.name}" loading="lazy">` : `<span class="minister-profile-number">${minister.number}</span><span class="minister-avatar"><svg viewBox="0 0 64 64" focusable="false"><circle cx="32" cy="22" r="11"/><path d="M11 58c1.5-13 9-20 21-20s19.5 7 21 20"/></svg></span><span class="minister-art-ring"></span>`}</div>
  <div class="minister-profile-copy"><h2>${minister.name}</h2>${minister.bio.startsWith('<p>') ? minister.bio : `<p>${minister.bio}</p>`}</div>
</article>`).join('');

