import { Input } from "@/components/ui/input";

export function SearchForm({ defaultValue, placeholder }: { defaultValue?: string; placeholder: string }) {
  return (
    <form className="max-w-sm">
      <Input name="q" defaultValue={defaultValue} placeholder={placeholder} />
    </form>
  );
}
