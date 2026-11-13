# Neon Maze Run

🎮 **Neon Maze Run** é um minigame original de labirinto com estética arcade retrô, criado com **HTML, CSS e JavaScript puro**.


## Recursos

- 🎮 Controles por teclado
- 📱 Botões touch grandes para celular
- 👆 Controle por gestos de deslizar
- ✨ Personagem e identidade visual originais
- 👾 Inimigos com comportamentos diferentes
- ⭐ Pontos e itens especiais
- ❤️ Sistema de vidas
- 📈 Fases progressivamente mais difíceis
- ⏳ Contagem regressiva antes da partida
- ⏸️ Pausar e reiniciar
- 🔊 Efeitos sonoros com Web Audio API
- 🔇 Opção para ativar/desativar os sons
- 🏆 Recorde salvo automaticamente no navegador
- 📱 Layout responsivo para Android, iPhone e computadores

## Desempenho

O jogo utiliza `requestAnimationFrame()` para o loop de animação e Canvas para renderização. O labirinto é pré-renderizado em uma camada interna, evitando redesenhar todas as paredes e centenas de itens a cada quadro.

Isso reduz significativamente o uso de CPU e melhora a fluidez, especialmente em smartphones.

## Como jogar

### Computador
Use:

- ⬆️ Seta para cima ou **W**
- ⬇️ Seta para baixo ou **S**
- ⬅️ Seta para esquerda ou **A**
- ➡️ Seta para direita ou **D**
- **Espaço** para pausar/continuar

### Celular
- Use os botões direcionais na parte inferior.
- Ou deslize o dedo sobre a área do jogo para alterar a direção.

## Objetivo

Colete todos os fragmentos luminosos do labirinto para avançar de fase.

Evite os Caçadores. Ao encostar em um inimigo, você perde uma vida.

Os **Núcleos especiais** permitem derrotar temporariamente os inimigos.

## Executar localmente

Como o projeto não possui dependências, basta abrir:

`index.html`

em um navegador moderno.

Para uma experiência mais próxima da hospedagem, também é possível servir os arquivos com qualquer servidor HTTP estático.

## Tecnologias

- HTML5
- CSS3
- JavaScript
- Canvas API
- Web Audio API
- localStorage


---

Projeto original inspirado no estilo geral dos clássicos jogos de labirinto arcade, sem utilizar personagens, nomes, mapas, imagens ou músicas protegidas de outros jogos.
