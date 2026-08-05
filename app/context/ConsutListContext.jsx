import {createContext, useContext, useState} from 'react';
import Cookies from 'js-cookie';

const ConsultListContext = createContext();

export function ConsultListProvider({children}) {
  const [consultProducts, setConsultProducts] = useState(() => {
    const savedItems = Cookies.get('consultItems');
    return savedItems ? JSON.parse(savedItems) : [];
  });

  const clearConsultProducts = () => {
    Cookies.remove('consultItems');
    setConsultProducts([]);
  };

  const getConsultProducts = () => {
    return consultProducts;
  };

  const reducedProduct = (product) => {
    return {
      title: product.product.title,
      sku: product.sku,
    };
  };

  const isAlreadyIn = (product) => {
    return (
      consultProducts.filter((el) => el.sku === reducedProduct(product).sku)
        .length != 0
    );
  };

  const deleteProduct = (product) => {
    const listWithoutDeletedProduct = consultProducts.filter(
      (el) => el.sku != reducedProduct(product).sku,
    );
    Cookies.set('consultItems', JSON.stringify(listWithoutDeletedProduct));
    setConsultProducts(listWithoutDeletedProduct);
  };

  const addProduct = (product) => {
    Cookies.set(
      'consultItems',
      JSON.stringify([...consultProducts, reducedProduct(product)]),
    );
    setConsultProducts([...consultProducts, reducedProduct(product)]);
  };

  return (
    <ConsultListContext.Provider
      value={{
        clearConsultProducts,
        getConsultProducts,
        addProduct,
        deleteProduct,
        isAlreadyIn,
      }}
    >
      {children}
    </ConsultListContext.Provider>
  );
}

export const useConsultList = () => {
  return useContext(ConsultListContext);
};
