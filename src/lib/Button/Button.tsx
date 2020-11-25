import React from "react";
import "./button.css";

export type ButtonProps = {
  text: string;
};

const Button = ({ text }: ButtonProps) => {
  return <button className="btn">{text}</button>;
};

export { Button };
