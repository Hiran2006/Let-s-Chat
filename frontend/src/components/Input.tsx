export default function Input({
  type,
  placeholder,
  value,
  onSet,
}: {
  type: "text" | "email" | "password";
  placeholder: string;
  value: string;
  onSet: (value: string) => void;
}) {
  return (
    <input
      className="p-3 rounded focus:outline-0 text-white bg-[#1e1e1e]"
      type={type}
      placeholder={placeholder}
      onChange={(e) => onSet(e.target.value)}
      value={value}
    />
  );
}

