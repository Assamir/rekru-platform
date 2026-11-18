/// <reference types="vite/client" />

declare module '*.java?raw' {
  const content: string;
  export default content;
}
