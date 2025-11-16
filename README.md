# Trabalho Three.js + cannon-es — Commit 1 (Cena Base)

Este commit contém a cena base funcional:

- Skybox com textura de céu (`assets/textures/skybox.png`);
- Piso (floor) com `MeshStandardMaterial`;
- Pedestal (cubo) iluminado com `AmbientLight` + `SpotLight`;
- Cubo de "cortina" com textura (`assets/textures/curtain.jpg`);
- Integração de física com **cannon-es** (mundo, chão e corpo da cortina);
- Clique do mouse remove a cortina da cena (revelação do pedestal).

Ainda **não** há modelo GLTF do carro neste commit.
