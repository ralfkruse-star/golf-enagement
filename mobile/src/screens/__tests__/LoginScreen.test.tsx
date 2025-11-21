import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import LoginScreen from '../LoginScreen';

const mockNavigation = {
  navigate: jest.fn(),
};

describe('LoginScreen', () => {
  it('should render login form', () => {
    const { getByPlaceholderText, getByText } = render(
      <LoginScreen navigation={mockNavigation} />
    );

    expect(getByPlaceholderText('Email')).toBeTruthy();
    expect(getByPlaceholderText('Passwort')).toBeTruthy();
    expect(getByText('Anmelden')).toBeTruthy();
  });

  it('should navigate to register screen', () => {
    const { getByText } = render(<LoginScreen navigation={mockNavigation} />);

    fireEvent.press(getByText(/registrieren/i));
    expect(mockNavigation.navigate).toHaveBeenCalledWith('Register');
  });

  it('should update email and password fields', () => {
    const { getByPlaceholderText } = render(<LoginScreen navigation={mockNavigation} />);

    const emailInput = getByPlaceholderText('Email');
    const passwordInput = getByPlaceholderText('Passwort');

    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.changeText(passwordInput, 'password123');

    expect(emailInput.props.value).toBe('test@example.com');
    expect(passwordInput.props.value).toBe('password123');
  });
});
