import {createContext, useContext, useState} from 'react';
import Cookies from 'js-cookie';

const UserContext = createContext();

export function UserProvider({children}) {
  const [user, setUser] = useState(() => {
    const userData = Cookies.get('userData');
    return userData ? JSON.parse(userData) : null;
  });

  const setUserData = (userData) => {
    Cookies.set('userData', JSON.stringify(userData));
    setUser(userData);
  };

  const clearUserData = () => {
    Cookies.remove('userData');
    setUser(null);
  };

  const getUserData = () => {
    return user;
  };

  const isUserLoggedIn = () => {
    return user !== null;
  };

  return (
    <UserContext.Provider
      value={{
        getUserData,
        setUserData,
        isUserLoggedIn,
        clearUserData,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export const useUser = () => {
  return useContext(UserContext);
};
