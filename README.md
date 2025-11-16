# Trabalho Three.js + cannon-es — Cena Ferrari F40

- Modelo GLTF externo: **1989 Ferrari F40 LM** (Sketchfab), carregado via `GLTFLoader`.
- Piso, pedestal embaixo do carro, iluminação com `AmbientLight` + `SpotLight`.
- Skybox com textura de céu (`assets/textures/skybox.png`) usando mapeamento equiretangular.
- Geometria básica: cubo do pedestal e cubo da cortina com textura própria.
- Animação:
  - Carro gira lentamente em loop.
  - Clique do mouse remove a "cortina" imediatamente, revelando o carro.
- Integração de física com **cannon-es** (mundo, chão e corpo da cortina).

## Estrutura de pastas

```text
index.html
main.js
assets/
  models/
    scene.gltf
    scene.bin
    textures/        # texturas originais da Ferrari (Sketchfab)
  textures/
    skybox.png       # textura de céu
    curtain.jpg      # textura vermelha usada na cortina
```

## Como rodar

1. Suba um servidor local (exemplos):

   - VS Code + extensão **Live Server** → clique direito em `index.html` → "Open with Live Server".
   - ou com Node.js instalado:

     ```bash
     npx serve .
     ```

2. Acesse o endereço indicado (por exemplo `http://localhost:3000`).

3. Controles na cena:

   - **Mouse**: orbita/zoom (OrbitControls).
   - **Clique do mouse**: remove a cortina (cubo texturizado) que cobre o carro.

Essa cena atende aos requisitos do trabalho:

- Asset GLTF externo;
- Piso (Floor);
- Skybox com textura;
- Geometria básica + textura + SpotLight;
- Animação em loop (rotação do carro) e animação acionada por clique (cortina);
- Uso de cannon-es para física (bônus).

-Matheus Durigon Rodrigues 1134695 / Erick De Nardi 1134724