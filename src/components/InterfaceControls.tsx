"use client";
import {Children,cloneElement,forwardRef,isValidElement,type ReactNode,type ButtonHTMLAttributes,type LabelHTMLAttributes,type OptionHTMLAttributes} from "react";
import {useInterfaceLocale} from "@/lib/interfaceLocale";
export function translateControlChildren(children:ReactNode,ui:(value:string)=>string):ReactNode {
 return Children.map(children,node=>{
  if(typeof node==="string"){
   const original=node.trim(),translated=ui(original);
   return translated===original?node:node.replace(original,translated);
  }
  // Only presentation spans inside a control. Never traverse user comments,
  // chapter text, custom components, input values or calculation data.
  if(isValidElement<{children?:ReactNode;translate?:string}>(node)&&node.props.translate!=='no'&&typeof node.type==="string"&&['span','strong','small','b','em'].includes(node.type))return cloneElement(node,{children:translateControlChildren(node.props.children,ui)});
  return node;
 });
}
function originalText(children:ReactNode):string {
 return Children.toArray(children).map(node=>typeof node==='string'||typeof node==='number'?String(node):isValidElement<{children?:ReactNode}>(node)?originalText(node.props.children):'').join('');
}
export const InterfaceButton=forwardRef<HTMLButtonElement,ButtonHTMLAttributes<HTMLButtonElement>>(function InterfaceButton({children,title,...props},ref){
 const {ui}=useInterfaceLocale();return <button {...props} ref={ref} title={title?ui(title):undefined} aria-label={props['aria-label']?ui(props['aria-label']):undefined}>{props.translate==='no'?children:translateControlChildren(children,ui)}</button>;
});
export const InterfaceLabel=forwardRef<HTMLLabelElement,LabelHTMLAttributes<HTMLLabelElement>>(function InterfaceLabel({children,...props},ref){const {ui}=useInterfaceLocale();return <label {...props} ref={ref}>{props.translate==='no'?children:translateControlChildren(children,ui)}</label>;});
export const InterfaceOption=forwardRef<HTMLOptionElement,OptionHTMLAttributes<HTMLOptionElement>>(function InterfaceOption({children,value,...props},ref){const {ui}=useInterfaceLocale();return <option {...props} ref={ref} value={value===undefined?originalText(children):value}>{props.translate==='no'?children:translateControlChildren(children,ui)}</option>;});
