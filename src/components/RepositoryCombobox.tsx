import { useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from './ui/utils';
import { Button } from './ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from './ui/command';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';

interface RepositoryComboboxProps {
  value: string;
  onChange: (value: string) => void;
  repositories: string[];
}

export function RepositoryCombobox({ value, onChange, repositories }: RepositoryComboboxProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {value || 'Select repository...'}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput placeholder="Search repository..." />
          <CommandList>
            <CommandEmpty>No repository found.</CommandEmpty>
            <CommandGroup>
              {repositories.map((repo) => (
                <CommandItem
                  key={repo}
                  value={repo}
                  onSelect={(currentValue) => {
                    onChange(currentValue === value ? '' : currentValue);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === repo ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  {repo}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
