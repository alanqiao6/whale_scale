/* File: App.test.jsx
* Authors: Alan Qiao, August Hao, Ciaran Burr, Jason Fitzpatrick
* Purpose: Default test cases to verify propering rendering of application
*/
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders learn react link', () => {
  render(<App />);
  const linkElement = screen.getByText(/learn react/i);
  expect(linkElement).toBeInTheDocument();
});
