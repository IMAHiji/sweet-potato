import React from "react";
import { Meta, Story } from "@storybook/react/types-6-0";
import { Button, ButtonProps } from "../src/lib/Button/Button";

export default {
  title: "Example/Button",
  component: Button,
};

const Template: Story<ButtonProps> = (args) => <Button {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  label: "Button",
};
