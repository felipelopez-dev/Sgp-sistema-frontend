# SGP – Sistema de Gerenciamento de Produção

O **SGP (Sistema de Gerenciamento de Produção)** é uma aplicação web desenvolvida para **controle operacional de estoque e apoio à tomada de decisão em ambientes industriais**, com foco em **simplicidade, confiabilidade e atualização em tempo real**.

O sistema utiliza **JavaScript moderno (ES Modules)** integrado ao **Firebase Realtime Database**, permitindo operações instantâneas de leitura e escrita.

---

## Índice

- [Objetivo do Sistema](#objetivo-do-sistema)  
- [Visão Geral Técnica](#visão-geral-técnica)  
- [Funcionalidades Principais](#funcionalidades-principais)  
- [Fluxo de Uso do Sistema](#fluxo-de-uso-do-sistema)  
- [Acesso ao Sistema](#acesso-ao-sistema)  
- [Resultados Obtidos em Ambiente Real](#resultados-obtidos-em-ambiente-real)  
- [Arquitetura do Projeto](#arquitetura-do-projeto)  
- [Tecnologias Utilizadas](#tecnologias-utilizadas)  
- [Integração com Firebase](#integração-com-firebase)  
- [Paleta de Cores e Tipografia](#paleta-de-cores-e-tipografia)  
- [Possíveis Evoluções](#possíveis-evoluções)  
- [Licença](#licença)  
- [Autor](#autor)  
- [Agradecimentos](#agradecimentos)  

---

## Objetivo do Sistema

Reduzir erros operacionais no controle de caixas e melhorar o planejamento produtivo por meio de **cálculos automatizados**, **registro padronizado de dados** e **visualização clara das informações**.

---

## Visão Geral Técnica

O SGP foi projetado como uma aplicação **frontend-first**, sem dependência de frameworks pesados, priorizando:

- Baixa complexidade de deploy  
- Facilidade de manutenção  
- Compatibilidade com ambientes industriais (monitores, operadores e painéis)  

A arquitetura separa claramente:
- Camada de apresentação (HTML/CSS)
- Lógica de negócio (JavaScript modular)
- Persistência e automações (Firebase)

---

## Funcionalidades Principais

- Controle de estoque em tempo real
- Registro e exclusão de itens com histórico
- Cálculo diário do saldo de caixas no túnel
- Visualização de dados para operadores e monitores
- Apoio ao planejamento produtivo
- Interfaces adaptadas para diferentes perfis de uso

---

## Fluxo de Uso do Sistema

Após o login, o usuário acessa a **área principal do sistema**, onde são realizados os apontamentos diários de produção.  
A interface foi projetada para **ambientes industriais**, priorizando clareza visual, poucos cliques e redução de erros humanos.

---

### Tela de Login

O sistema começa com uma tela simples e objetiva de login:

![Tela de Login](https://raw.githubusercontent.com/felipelopez-dev/sgp-sistema-frontend/main/assets/img/screenshots/login.png)

---

### Página Principal

A página inicial centraliza o acesso às funcionalidades operacionais do SGP.

![Página Principal](https://raw.githubusercontent.com/felipelopez-dev/sgp-sistema-frontend/main/assets/img/screenshots/home.png)

---

## Acesso ao Sistema

👉 **[Acessar o SGP](https://felipelopez-dev.github.io/Sgp-sistema-frontend/)**  

> Recomendado acessar via servidor (GitHub Pages ou Firebase Hosting) para correto funcionamento dos ES Modules.

---

## Resultados Obtidos em Ambiente Real

| Critério | Antes do SGP | Depois do SGP |
|--------|-------------|---------------|
| Controle de caixas | Anotações manuais | Automatizado |
| Planejamento da produção | Impreciso | Baseado em dados reais |
| Ocupação do túnel | Extrapolação frequente | Monitoramento diário |
| Comunicação entre turnos | Informal | Padronizada |
| Margem de erro | 600 a 1000 caixas | 30 a 200 caixas |

**Resultado:**  
A margem de erro operacional foi reduzida em **mais de 90%**, melhorando previsibilidade, eficiência e segurança do processo.

---

## Arquitetura do Projeto

```text
Sgp-sistema-frontend/
├── assets/
│   ├── css/            # Estilos e componentes
│   ├── js/             # Scripts e lógica de negócio
│   ├── img/            # Imagens e ícones
│   └── audio/          # Feedback sonoro
│
├── pages/              # Páginas por funcionalidade
│
├── index.html
├── index-operador.html
├── index-monitor.html
└── README.md

---

## Tecnologias Utilizadas

- HTML5  
- CSS3  
- JavaScript (ES6+ / ES Modules)  
- Firebase Realtime Database  
- Manipulação direta do DOM

---

## Backend (BaaS)

- Firebase Realtime Database
- Firebase Admin SDK

---

## Qualidade de Código e Convenções

- Biome
- Stylelint
- ITCSS (estrutura de CSS)
- BEM (nomenclatura de classes)
- Convenção de nomes: camelCase
- Tokens de design

---

## Integração com Firebase

A persistência de dados e sincronização em tempo real são realizadas via Firebase Realtime Database.

Arquivo de configuração:
**assets/js/pages/register/firebaseConfig.js**

---

## Paleta de Cores e Tipografia

**Fonte principal:** Inter

### Paleta:

| Cor     | Código Hex   | Descrição                  |
|---------|--------------|----------------------------|
| ⬛️ Preto      | `#000000`    | Texto ou fundo principal     |
| 🔵 Azul escuro | `#0A1E40`    | Destaques intensos           |
| 🔷 Azul médio  | `#165BAA`    | Botões ou links principais   |
| 🔹 Azul claro  | `#0065DA`    | Hover ou interações leves    |
| 🔹 Azul suave  | `#40A8F5`    | Destaques em áreas claras    |
| ⚪️ Cinza claro | `#C0C2C7`    | Bordas ou plano de fundo     |
| ⚪️ Muito claro | `#F5F6F8`    | Fundo padrão de páginas      |
| ⚪️ Cinza suave | `#ECEEF2`    | Elementos neutros            |
| ⚫️ Cinza escuro | `#24272F`    | Texto secundário ou ícones   |
| ⚫️ Cinza médio | `#353841`    | Cabeçalhos ou menus          |
| ⚫️ Cinza leve  | `#5F6268`    | Legendas ou rodapés          |
| 🟥 Vermelho     | `#FF0000`    | Alertas ou mensagens de erro |

---

## Possíveis Evoluções

- Autenticação Firebase  
- Controle de permissões  
- Dashboard analítico  
- Backend dedicado  

---

## Licença

Este projeto é um software proprietário.

Todo o código-fonte, a lógica de negócio e a documentação associada
são de propriedade exclusiva do autor. O uso, cópia, modificação
ou redistribuição não são permitidos sem autorização prévia e expressa.

Para informações sobre licenciamento comercial, entre em contato com o autor.

---

## Autor

Felipe Lopez  
Desenvolvedor Frontend | Engenheiro de Software

---

## Agradecimentos

Primeiramente, agradeço a Deus por me guiar nas dificuldades. Sou grato à minha família, que sempre esteve ao meu lado, oferecendo suporte. Também expresso minha gratidão à equipe de produção da empresa, que me inspirou e colaborou na criação deste sistema.
