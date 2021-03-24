import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');
    if (storagedCart) {
      return JSON.parse(storagedCart);
    }
    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const [{ data }, { data: stock }] = await Promise.all([
        await api.get(`products/${productId}`),
        await api.get(`stock/${productId}`)
      ])
      const productInCart = cart.find(cartProd => cartProd.id === productId);
      if (!productInCart) {
        setCart([...cart,
        { ...data, amount: 1 }]);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify([...cart,
        { ...data, amount: 1 }]));
      } else {
        if (stock.amount > productInCart.amount) {
          const products = cart.map(cartProd => {
            if (cartProd.id === productId) {
              cartProd.amount += 1;
            }
            return cartProd
          })
          setCart(products)
          localStorage.setItem('@RocketShoes:cart', JSON.stringify(products));
        } else {
          toast.error('Quantidade solicitada fora de estoque')
          return
        }
      }
    } catch (err){
      toast.error('Quantidade solicitada fora de estoque')
      toast.error('Erro na adição do produto')
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const productExists = cart.findIndex(prod => prod.id === productId);
      if (productExists === -1) {
        toast.error('Erro na remoção do produto')
        return;
      }
      const products = cart.filter(product => product.id !== productId);
      localStorage.clear();
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(products));
      setCart(products);
    } catch {
      toast.error('Erro na remoção do produto')
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const { data } = await api.get(`stock/${productId}`)

      if (data.amount >= amount && amount > 0) {
        const cartChanged = cart.map(prod => {
          if (prod.id === productId) {
            prod.amount = amount;
          }
          return prod;
        })
        localStorage.clear();
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(cartChanged));
        setCart(cartChanged);
      } else {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
