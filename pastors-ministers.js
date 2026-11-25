(() => {
  const form = document.querySelector('#pastors-form');
  if (!form) return;

  const submit = document.querySelector('#pastors-submit');
  const feedback = document.querySelector('#pastors-form-feedback');
  const fieldNames = [
    'full_name', 'email', 'phone', 'gender', 'church_name', 'ministerial_position',
    'country', 'city', 'session_keys', 'expected_arrival_date', 'accompanying_persons',
    'accommodation_assistance', 'additional_information', 'privacy_consent', 'contact_consent'
  ];
  let isSubmitting = false;

  function clearErrors() {
    fieldNames.forEach((name) => {
      const error = document.querySelector(`#error-${name}`);
      if (error) error.textContent = '';
      form.querySelectorAll(`[name="${name}"]`).forEach((field) => field.removeAttribute('aria-invalid'));
    });
    feedback.hidden = true;
    feedback.className = 'pastors-form-feedback';
    feedback.textContent = '';
  }

  function showErrors(fields) {
    let firstInvalid = null;
    Object.entries(fields || {}).forEach(([name, message]) => {
      const error = document.querySelector(`#error-${name}`);
      const controls = [...form.querySelectorAll(`[name="${name}"]`)];
      if (error) error.textContent = message;
      controls.forEach((field) => field.setAttribute('aria-invalid', 'true'));
      firstInvalid ||= controls[0];
    });
    if (firstInvalid) firstInvalid.focus();
  }

  function showFeedback(message, type) {
    feedback.hidden = false;
    feedback.className = `pastors-form-feedback is-${type}`;
    feedback.textContent = message;
    feedback.focus();
  }

  function getPayload() {
    const data = new FormData(form);
    return {
      full_name: data.get('full_name'),
      email: data.get('email'),
      phone: data.get('phone'),
      gender: data.get('gender'),
      church_name: data.get('church_name'),
      ministerial_position: data.get('ministerial_position'),
      country: data.get('country'),
      city: data.get('city'),
      session_keys: data.getAll('session_keys'),
      accompanying_persons: data.get('accompanying_persons'),
      accommodation_assistance: data.get('accommodation_assistance'),
      expected_arrival_date: data.get('expected_arrival_date'),
      additional_information: data.get('additional_information'),
      privacy_consent: data.has('privacy_consent'),
      contact_consent: data.has('contact_consent'),
      company_website: data.get('company_website')
    };
  }

  form.addEventListener('input', (event) => {
    const field = event.target;
    if (!field.name) return;
    const error = document.querySelector(`#error-${field.name}`);
    if (error) error.textContent = '';
    field.removeAttribute('aria-invalid');
  });
  form.addEventListener('change', (event) => {
    const field = event.target;
    if (!field.name) return;
    const error = document.querySelector(`#error-${field.name}`);
    if (error) error.textContent = '';
    form.querySelectorAll(`[name="${field.name}"]`).forEach((control) => control.removeAttribute('aria-invalid'));
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (isSubmitting) return;
    clearErrors();
    if (!form.reportValidity()) return;
    if (!form.querySelector('[name="session_keys"]:checked')) {
      showErrors({ session_keys: 'Select at least one session.' });
      return;
    }

    isSubmitting = true;
    submit.disabled = true;
    submit.innerHTML = '<span>Sending your registration…</span><span aria-hidden="true">…</span>';
    try {
      const response = await fetch('/api/register-minister', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(getPayload())
      });
      const result = await response.json().catch(() => ({}));
      if (response.status === 400 && result.fields) {
        showErrors(result.fields);
        showFeedback('Please check the highlighted fields and try again.', 'error');
        return;
      }
      if (!response.ok) throw new Error(result.error || 'We could not save your registration. Your details are still here; please try again.');

      form.reset();
      document.querySelector('#minister-guests').value = '0';
      form.querySelectorAll('[aria-invalid]').forEach((field) => field.removeAttribute('aria-invalid'));
      showFeedback(`Your registration has been received and is awaiting review. Reference: ${result.reference}. The team will follow up with event information.`, 'success');
      feedback.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch (error) {
      showFeedback(error.message || 'We could not reach the registration service. Your details are still here; please try again.', 'error');
    } finally {
      isSubmitting = false;
      submit.disabled = false;
      submit.innerHTML = '<span>Submit registration</span><span aria-hidden="true">↗</span>';
    }
  });
})();
