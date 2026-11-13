# Neon Maze Run

Jogo de labirinto arcade com visual retrô, fases progressivas e controles para computador e celular.

---

## 📋 Sobre o projeto

O **Neon Maze Run** é um minigame original de labirinto inspirado no estilo dos clássicos jogos arcade, desenvolvido com identidade visual própria e sem utilizar personagens, nomes, mapas ou músicas de outros jogos.

O jogador controla uma esfera luminosa e precisa coletar todos os fragmentos espalhados pelo labirinto enquanto evita os Caçadores. Ao concluir todos os fragmentos, uma nova fase é iniciada com dificuldade progressivamente maior.

A proposta é oferecer uma experiência leve, divertida e viciante diretamente no navegador, com foco em visual retrô, boa fluidez e jogabilidade simples tanto no desktop quanto no celular.

---

## ✨ Funcionalidades

* Labirintos com fases progressivas
* Sistema de pontuação
* Sistema de vidas
* Recorde salvo automaticamente no navegador
* Inimigos com comportamentos diferentes
* Itens especiais que permitem derrotar temporariamente os inimigos
* Aumento gradual da dificuldade
* Contagem regressiva antes do início da partida
* Sistema de pausa e reinício
* Game Over com pontuação final e maior pontuação
* Controles por teclado
* Controles touch para dispositivos móveis
* Controle por gestos de deslizar
* Efeitos sonoros com opção de ativar ou desativar
* Interface moderna, responsiva e inspirada em arcades retrô
* Otimização da renderização para melhor desempenho em celulares

---

## 🛠️ Tecnologias

* HTML5
* CSS3
* JavaScript
* HTML5 Canvas 2D — renderização do jogo
* Web Audio API — efeitos sonoros
* localStorage — armazenamento do recorde
* requestAnimationFrame — loop de animação

---

## 🎮 Controles

### Desktop

* **Seta para cima** ou **W** — mover para cima
* **Seta para baixo** ou **S** — mover para baixo
* **Seta para esquerda** ou **A** — mover para a esquerda
* **Seta para direita** ou **D** — mover para a direita
* **Espaço** — pausar ou continuar

### Mobile

* Botões direcionais na parte inferior da tela
* Deslize o dedo sobre a área do jogo para alterar a direção
* Botões grandes e adaptados para telas touch

---

## 🎯 Objetivo do jogo

Colete todos os fragmentos luminosos presentes no labirinto para avançar para a próxima fase.

Evite os Caçadores. Ao encostar em um inimigo, o jogador perde uma vida.

Os Núcleos especiais permitem deixar os inimigos vulneráveis temporariamente, possibilitando derrotá-los e ganhar pontos extras.

---

## 📱 Experiência responsiva

O jogo foi desenvolvido para funcionar em diferentes tamanhos de tela, incluindo computadores, tablets e smartphones.

A interface utiliza controles touch no mobile e mantém suporte completo ao teclado em computadores.

A área do jogo foi otimizada para aproveitar melhor a tela do celular sem causar rolagem horizontal.

---

## 🚀 Como executar localmente

### 1. Clone o repositório

```bash
git clone https://github.com/programadorcosta87-eng/Neon-Maze-Run.git
```

### 2. Entre na pasta

```bash
cd Neon-Maze-Run
```

### 3. Execute localmente

Como o projeto não possui dependências externas, basta abrir:

```text
index.html
```

diretamente em um navegador moderno.

Também é possível utilizar qualquer servidor HTTP estático para executar o projeto localmente.

---

## ⚡ Desempenho

O jogo utiliza **Canvas** e `requestAnimationFrame()` para a renderização e animação.

O labirinto é pré-renderizado em uma camada interna, reduzindo a necessidade de redesenhar paredes e elementos estáticos a cada quadro. Isso melhora a fluidez e reduz o consumo de processamento, especialmente em dispositivos móveis.

---

## 👨‍💻 Desenvolvido por

[Adilson Costa](https://github.com/programadorcosta87-eng)
