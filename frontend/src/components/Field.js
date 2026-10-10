import { useId } from 'react';

// A labelled form control. The label is tied to the input (htmlFor/id), so screen
// readers announce it and tapping the label focuses the field.
//   <Field label="Email" type="email" value={...} onChange={...} required />
//   <Field as="textarea" label="Message" rows={4} />
//   <Field as="select" label="Category"><option>...</option></Field>
export default function Field({ label, hint, required, as: Tag = 'input', className = '', ...props }) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;

  return (
    <div>
      <label htmlFor={id} className="block text-sm uppercase tracking-widest mb-3 text-brand-muted">
        {label}
        {required && (
          <span className="text-brand-orange" aria-hidden="true">
            {' '}*
          </span>
        )}
      </label>
      <Tag
        id={id}
        required={required}
        aria-describedby={hintId}
        className={`input-brutalist w-full ${className}`}
        {...props}
      />
      {hint && (
        <p id={hintId} className="mt-2 text-sm text-brand-muted">
          {hint}
        </p>
      )}
    </div>
  );
}
