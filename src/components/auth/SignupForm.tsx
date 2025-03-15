
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface SignupFormProps {
  onSignup: (email: string, password: string) => Promise<void>;
  isLoading: boolean;
}

export const SignupForm = ({ onSignup, isLoading }: SignupFormProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async () => {
    await onSignup(email, password);
  };

  return (
    <div className="space-y-2">
      <Input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <Input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <Button
        className="w-full"
        onClick={handleSubmit}
        disabled={isLoading}
      >
        {isLoading ? 'Loading...' : 'Sign Up'}
      </Button>
    </div>
  );
};
