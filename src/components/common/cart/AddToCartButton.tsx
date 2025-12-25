"use client";

import React, { useEffect, useState } from "react";
import { FaMinus, FaPlus } from "react-icons/fa6";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/redux/store/store";
import {
  addToCart,
  updateQuantity,
  removeFromCart,
} from "@/redux/slices/cartSlice";
import Loading from "./Loading";
import { Product } from "@/@types/product";
import { cn } from "@/lib/utils";
import { IoCartOutline } from "react-icons/io5";
import {
  addCartItem,
  deleteCartItem,
  updateCartItem,
} from "@/services/operations/cartItem";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { setToken, setUser } from "@/redux/slices/authSlice";

interface Props {
  data: Product;
  className?: string;
  icon?: any;
}

const AddToCartButton: React.FC<Props> = ({ data, className, icon }) => {
  const dispatch = useDispatch();
  const router = useRouter();
  const { data: session } = useSession();
  const reduxToken = useSelector((state: RootState) => state.auth.token);
  
  // Use NextAuth session OR Redux token
  const token = reduxToken || (session?.user ? "google-auth-session" : null);
  const isLoggedIn = !!token || !!session?.user;

  const cartItems = useSelector((state: RootState) => state.cart.items);

  const [loading, setLoading] = useState(false);
  const [qty, setQty] = useState(0);

  const cartItem = cartItems.find((item) => item.product._id === data._id);

  useEffect(() => {
    if (cartItem) {
      setQty(cartItem.quantity);
    } else {
      setQty(0);
    }
  }, [cartItem]);

  // ================Add To Cart=========================
  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isLoggedIn) {
      toast.error("Please Login First");
      router.push("/auth/sign-in");
      return;
    }

    // If Google login (NextAuth session) but no Redux token, generate JWT token first
    if (session?.user && !reduxToken) {
      try {
        setLoading(true);
        const res = await fetch("/api/auth/google-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        
        if (!res.ok) {
          throw new Error("Token generation failed");
        }
        
        const tokenResponse = await res.json();
        if (!tokenResponse.success || !tokenResponse.data) {
          throw new Error("Invalid token response");
        }

        // Store tokens in Redux and localStorage
        dispatch(setToken(tokenResponse.data.accessToken));
        dispatch(setUser(tokenResponse.data.user));
        localStorage.setItem("accessToken", tokenResponse.data.accessToken);
        localStorage.setItem("refreshToken", tokenResponse.data.refreshToken);
        localStorage.setItem("user", JSON.stringify(tokenResponse.data.user));

        // Now proceed with add to cart using the new token
        const productId = data._id;
        const response = await addCartItem(productId, router, tokenResponse.data.accessToken);
        
        if (!response) {
          toast.error("Something went wrong!");
          return;
        }

        const addPayload = {
          _id: response._id,
          quantity: response.quantity,
          product: response.productId,
        };

        dispatch(addToCart(addPayload));
        toast.success("Item added to cart!");
        
      } catch (error) {
        console.error("Token generation or add to cart error:", error);
        toast.error(error instanceof Error ? error.message : "Failed to add item");
      } finally {
        setLoading(false);
      }
      return; // Exit early since we handled everything above
    }

    // Regular flow for users with existing tokens
    try {
      setLoading(true);
      const productId = data._id;
      const response = await addCartItem(productId, router, reduxToken!);
      
      if (!response) {
        toast.error("Something went wrong!");
        return;
      }

      const addPayload = {
        _id: response._id,
        quantity: response.quantity,
        product: response.productId,
      };

      dispatch(addToCart(addPayload));
      toast.success("Item added to cart!");
    } catch (error) {
      console.error("Add to cart error:", error);
      toast.error("Failed to add item");
    } finally {
      setLoading(false);
    }
  };

  // =========================Increase Quantity============================
  const increaseQty = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isLoggedIn) {
      toast.error("Please Login First");
      return;
    }

    // Ensure token exists for Google users
    let finalToken = reduxToken;
    if (session?.user && !reduxToken) {
      try {
        const res = await fetch("/api/auth/google-token", {
          method: "POST",
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            dispatch(setToken(data.data.accessToken));
            dispatch(setUser(data.data.user));
            localStorage.setItem("accessToken", data.data.accessToken);
            finalToken = data.data.accessToken;
          }
        }
      } catch (error) {
        console.error("Token generation failed:", error);
      }
    }

    if (!finalToken) {
      toast.error("Please Login First");
      return;
    }

    if (!data._id) return;
    const newQty = qty + 1;
    const cartId = cartItem?._id;

    const response = await updateCartItem(
      cartId as string,
      newQty,
      finalToken
    );

    const updatePayload = {
      _id: response._id,
      quantity: response.quantity,
      product: response.productId,
    };

    dispatch(updateQuantity(updatePayload));
  };

  // ==========Decrease Quantity=======================
  const decreaseQty = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isLoggedIn) {
      toast.error("Please Login First");
      return;
    }

    // Ensure token exists for Google users
    let finalToken = reduxToken;
    if (session?.user && !reduxToken) {
      try {
        const res = await fetch("/api/auth/google-token", {
          method: "POST",
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            dispatch(setToken(data.data.accessToken));
            dispatch(setUser(data.data.user));
            localStorage.setItem("accessToken", data.data.accessToken);
            finalToken = data.data.accessToken;
          }
        }
      } catch (error) {
        console.error("Token generation failed:", error);
      }
    }

    if (!finalToken) {
      toast.error("Please Login First");
      return;
    }

    if (!data._id) return;

    const newQty = qty - 1;
    const cartId = cartItem?._id;

    if (!cartId) return;

    if (newQty === 0) {
      try {
        const delresponse = await deleteCartItem(
          cartId as string,
          finalToken
        );

        dispatch(removeFromCart(cartId));
      } catch (error) {
        toast.error("Failed to remove item from cart.");
      }
    } else {
      const response = await updateCartItem(
        cartId as string,
        newQty,
        finalToken
      );

      const updatePayload = {
        _id: response._id,
        quantity: response.quantity,
        product: response.productId,
      };

      dispatch(updateQuantity(updatePayload));
    }
  };

  return (
    <div
      className={cn(
        "text-center cursor-pointer rounded-lg bg-white",
        className
      )}
    >
      {qty > 0 ? (
        <div className="flex w-full items-center gap-3">
          <button
            onClick={decreaseQty}
            style={{
              backgroundColor: "var(--cta-Bg)",
            }}
            disabled={loading}
            className="cursor-pointer hover:bg-(--cta-Bg-hover) text-white font-bold rounded-l-lg px-3 py-2 text-xs"
          >
            <FaMinus />
          </button>

          <p className="flex-1 text-center font-semibold">{qty}</p>

          <button
            onClick={increaseQty}
            style={{
              backgroundColor: "var(--cta-Bg)",
            }}
            disabled={loading}
            className="cursor-pointer hover:bg-(--cta-Bg-hover) text-white font-bold rounded-r-lg px-3 py-2 text-xs"
          >
            <FaPlus />
          </button>
        </div>
      ) : (
        <button
          onClick={handleAddToCart}
          className={`text-center flex gap-3 cursor-pointer items-center justify-center mx-auto font-semibold transition-all `}
        >
          {loading ? <Loading /> : "Add to cart"}
          {/* <IoCartOutline style={{ width: 20, height: 20 }} /> */}
          {icon}
        </button>
      )}
    </div>
  );
};

export default AddToCartButton;
