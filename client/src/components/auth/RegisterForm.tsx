import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Link } from 'wouter';
import { useAuth } from '../../hooks/useAuth';
import { initializeGoogleAuth, renderGoogleButton } from '../../lib/googleAuth';
import { useConfig } from '../../lib/env';

type RegisterFormValues = {
  name?: string;
  email: string;
  password: string;
  confirmPassword: string;
};

export function RegisterForm() {
  const { t } = useTranslation();
  const { register, loginWithGoogle, error, clearError, isLoading } = useAuth();
  const { config, loading: configLoading } = useConfig();
  const googleButtonRef = useRef<HTMLDivElement>(null);

  // Create the form schema with validation using translated messages
  const registerSchema = z.object({
    name: z.string().optional(),
    email: z.string().email(t('auth.validationEmail')),
    password: z.string().min(8, t('auth.validationPasswordMin')),
    confirmPassword: z.string().min(1, t('auth.validationConfirmPassword')),
  }).refine((data) => data.password === data.confirmPassword, {
    message: t('auth.validationPasswordMatch'),
    path: ['confirmPassword'],
  });

  // Initialize Google Sign-In when component mounts
  useEffect(() => {
    // Wait for config to be loaded
    if (configLoading || !config) {
      return;
    }
    
    // Set up Google Auth with the client ID from server config
    initializeGoogleAuth(config.googleClientId, async (credential) => {
      try {
        await loginWithGoogle(credential);
      } catch (err) {
        console.error('Google authentication error:', err);
      }
    });
    
    // Load the Google Identity Services script if it's not already loaded
    const scriptId = 'google-identity-script';
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        if (googleButtonRef.current) {
          // Small timeout to ensure Google API is fully initialized
          setTimeout(() => {
            renderGoogleButton('google-register-button');
          }, 100);
        }
      };
      document.body.appendChild(script);
    } else if (window.google && googleButtonRef.current) {
      // Script already loaded, just render the button
      renderGoogleButton('google-register-button');
    }
    
    return () => {
      // We don't remove the script on unmount as it might be used by other components
    };
  }, [loginWithGoogle, config, configLoading]);

  // Initialize the form with react-hook-form
  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  // Submit handler
  const onSubmit = async (values: RegisterFormValues) => {
    try {
      await register(
        values.email, 
        values.password, 
        values.confirmPassword,
        values.name
      );
    } catch (err) {
      // Error is handled in the auth context
      console.error('Registration submission error:', err);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl text-center">{t('auth.createAccount')}</CardTitle>
        <CardDescription className="text-center">
          {t('auth.enterDetails')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('auth.nameOptional')}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t('auth.yourName')}
                      type="text"
                      autoComplete="name"
                      {...field}
                      onChange={(e) => {
                        clearError();
                        field.onChange(e);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('auth.email')}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t('auth.emailPlaceholder')}
                      type="email"
                      autoComplete="email"
                      {...field}
                      onChange={(e) => {
                        clearError();
                        field.onChange(e);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('auth.password')}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t('auth.createPassword')}
                      type="password"
                      autoComplete="new-password"
                      {...field}
                      onChange={(e) => {
                        clearError();
                        field.onChange(e);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('auth.confirmPassword')}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t('auth.confirmPasswordPlaceholder')}
                      type="password"
                      autoComplete="new-password"
                      {...field}
                      onChange={(e) => {
                        clearError();
                        field.onChange(e);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? t('auth.creatingAccount') : t('auth.createAccount')}
            </Button>
          </form>
        </Form>

        <div className="mt-4 relative">
          <div className="absolute inset-0 flex items-center">
            <Separator className="w-full" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">{t('auth.orContinueWith')}</span>
          </div>
        </div>

        <div
          id="google-register-button"
          ref={googleButtonRef}
          className="mt-4"
          style={{
            display: 'flex',
            justifyContent: 'center',
            width: '100%',
            minHeight: '40px'
          }}
        ></div>

        {/* Container for Google Sign-In prompt */}
        <div id="google-signin-prompt-container"></div>
      </CardContent>
      <CardFooter className="flex justify-center">
        <p className="text-sm text-muted-foreground">
          {t('auth.alreadyHaveAccount')}{' '}
          <Link href="/login" className="text-primary font-medium hover:underline">
            {t('auth.logIn')}
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}