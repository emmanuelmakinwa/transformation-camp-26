(() => {
  const form = document.querySelector('#registration-form');
  const submit = document.querySelector('#registration-submit');
  const submitText = document.querySelector('#registration-submit-text');
  const submitArrow = document.querySelector('#registration-submit-arrow');
  const message = document.querySelector('#registration-message');
  const isLocalPreview = ['localhost', '127.0.0.1'].includes(window.location.hostname);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    if (isLocalPreview) {
      message.className = 'registration-message registration-message-error';
      message.textContent = 'No details were sent. This local preview is not connected to the registration service. Use the official registration form below to submit.';
      return;
    }

    const values = new FormData(form);
    const payload = {
      first_name: String(values.get('first_name') || '').trim(),
      last_name: String(values.get('last_name') || '').trim(),
      email: String(values.get('email') || '').trim(),
      phone: String(values.get('phone') || '').trim(),
      gender: String(values.get('gender') || '').trim(),
      country: String(values.get('country') || '').trim(),
      state: String(values.get('state') || '').trim(),
      city: String(values.get('city') || '').trim(),
      accommodation_required: values.get('accommodation_required') === 'true'
    };

    message.textContent = '';
    message.className = 'registration-message';
    submit.disabled = true;
    submit.setAttribute('aria-busy', 'true');
    submitText.textContent = 'Submitting…';
    submitArrow.textContent = '';

    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Unable to complete registration. Please try again.');
      if (!result.registration_reference) throw new Error('Registration could not be confirmed. Please contact the camp team or use the official registration form.');

      message.className = 'registration-message registration-message-success';
      message.textContent = `Registration successful. Your reference is ${result.registration_reference}.`;
      form.reset();
    } catch (error) {
      message.className = 'registration-message registration-message-error';
      message.textContent = error.message || 'Unable to complete registration. Please try again.';
    } finally {
      submit.disabled = false;
      submit.removeAttribute('aria-busy');
      submitText.textContent = 'Register for camp';
      submitArrow.textContent = '↗';
    }
  });
})();
