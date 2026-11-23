# Issue #30 — Especificação matemática para revisão

**Passo 5 · versão candidata a aceite.** D1–D5 são as decisões de partida já aprovadas pelo Eng. Gustavo Azocar. Os itens **[REVISAR]** permanecem abertos. A revisão por contribuidores foi solicitada na issue. A base bibliográfica está no [relatório versionado da #29](ESTABILIDADE-TALUDES-REFERENCIAS.md). [Aceite D1–D5 e pedido de revisão](https://github.com/ricardocorsini/openstruct-front/issues/30#issuecomment-6850038580).

## 1. Modelo e entradas

Equilíbrio-limite estático, 2D, por unidade de largura fora do plano. A superfície de ruptura é circular. Fellenius é o método de referência e Bishop Simplificado é o principal. Usar Mohr–Coulomb por material. O recorte abrange seção estratificada, linha piezométrica prescrita e faixas de sobrecarga vertical uniforme. Contenções, reforços, superfícies não circulares, sismo, fluxo numérico, água externa, sucção e trincas modeladas ficam fora deste contrato. [Escopo da #30](https://github.com/ricardocorsini/openstruct-front/issues/30).

| Entrada | Definição e domínio |
| --- | --- |
| Seção e sentido de movimento | Coordenadas em m. Normalizar $x$ no sentido do movimento e $z$ positivo para cima. Para movimento no sentido oposto do eixo de entrada, espelhar todas as coordenadas horizontais, incluindo água, cargas, centros e limites. A referência altimétrica é comum. |
| Terreno $z_g(x)$ e materiais | Perfil e regiões de solo definidos geometricamente. Cada ponto interior da massa deslizante tem um único material. Falta de cobertura e sobreposição são inválidas. A área de cada material na fatia entra no peso, e a resistência é do material na base. |
| Resistência | Para a fatia $i$, $c_i$ é a coesão em kPa e $\phi_i$ é o ângulo de atrito. Em tensões efetivas representam $c'_i,\phi'_i$. Em tensões totais representam os parâmetros totais e a pressão neutra usada na resistência é zero. Proposta de domínio em **[REVISAR R2]**. |
| Peso específico | $\gamma_j>0$ é o peso específico total, em kN/m³, atribuído ao material $j$ ou à subárea correspondente. Peso submerso não substitui peso total ao usar pressão neutra. |
| Água | Estado explícito seco ou linha piezométrica $z_p(x)$ com $\gamma_w>0$ em kN/m³. Linha ativa deve cobrir o domínio horizontal do candidato. Lâmina externa declarada que demande empuxo invalida o modelo neste escopo. |
| Sobrecarga | Faixa $j$ de intensidade descendente $q_j\ge0$, em kPa, uniforme sobre seu intervalo em projeção horizontal. Faixas sobrepostas são somadas. O intervalo deve ter extensão positiva e estar contido na cobertura do terreno. |
| Superfície ou busca | Círculo fixo $(x_c,z_c,R)$, em m, com centro $(x_c,z_c)$ e $R>0$, ou malha de centros e raios do §5. |
| Perfil numérico | Registra $F_0>0$ e a tolerância absoluta $\tau_F>0$, ambos adimensionais, e $K\ge1$, inteiro, como número máximo de avaliações da atualização de Bishop. Registra tolerância geométrica $\varepsilon_x$ em m, limiar $\tau_D$ em kN/m, limiar $\tau_m$ adimensional, tolerância de tração $\tau_t$ em kPa e faixa de quase empate $\tau_\mathrm{emp}$ adimensional, todos finitos e não negativos. Passos da malha são positivos. Limites adicionais e política de apresentação em **[REVISAR R3–R6]**. |

Comprimento e área são tratados em m e m², forças por unidade de largura em kN/m, momentos por unidade de largura em kN·m/m, tensões em kPa, e ângulos em radianos no cálculo e graus na entrada e no relatório. Coeficientes e FS são adimensionais. Registrar parâmetros e resultados em precisão de cálculo. Arredondar somente para apresentação. Os exemplos publicados conservam suas unidades originais coerentes.

## 2. Preparação geométrica e fatias

O arco candidato é o ramo inferior $z_s(x)=z_c-\sqrt{R^2-(x-x_c)^2}$. Determinar seus cruzamentos com o terreno por segmentos, mantendo raízes no segmento e no ramo inferior. **[REVISAR R1]** recomenda exigir duas interseções transversais distintas, confirmadas pela troca de sinal de $z_g-z_s$ nos lados de cada encontro, com deduplicação de vértices compartilhados. Contato na borda da seção que impeça a verificação dos dois lados recebe diagnóstico de domínio truncado. Entre as interseções deve haver massa contínua com $z_g>z_s$ no interior e cobertura integral de materiais. Arco fora da seção, tangência, trechos sobrepostos, cruzamentos adicionais e massa nula são rejeitados nesta proposta com motivo explícito.

Criar cortes verticais nos cruzamentos com terreno, vértices do terreno entre as extremidades, cruzamentos arco–interface de material e arco–linha piezométrica, nós da linha piezométrica e limites de sobrecarga. Para cada intervalo obrigatório, calcular a abertura central $\Delta\theta$ em radianos e propor $n_s=\lceil\Delta\theta/(3\pi/180)\rceil$ subintervalos de abertura igual. Converter os pontos do arco em cortes verticais. Os cortes obrigatórios permanecem e o refinamento permite checar sensibilidade. Uma fatia degenerada por cortes distintos demasiado próximos deve receber diagnóstico. A tolerância geométrica e o tratamento de fatias estreitas seguem em **[REVISAR R1, R3]**.

Para cada fatia $i$, sejam $x_{L,i}$ e $x_{R,i}$ os limites horizontais com $b_i=x_{R,i}-x_{L,i}>0$, em m. A base é aproximada pela corda entre seus extremos no arco. Se $\Delta z_i=z_s(x_{R,i})-z_s(x_{L,i})$, então $\alpha_i=\operatorname{atan2}(-\Delta z_i,b_i)$, positiva se a base desce no sentido do movimento. Seu comprimento é $\ell_i=\sqrt{b_i^2+\Delta z_i^2}$. Segue $b_i=\ell_i\cos\alpha_i$.

**[REVISAR R1]** propõe usar como ponto representativo $(x_{a,i},z_{a,i})$ o ponto do arco cuja tangente é paralela à corda, isto é, o ponto médio angular do arco da fatia. Nesse ponto, $x_{a,i}=x_c-R\sin\alpha_i$. Usar o ponto do arco para classificar o material da base e avaliar a pressão. Calcular $A_{ij}$, a área em m² do material $j$ entre terreno e arco dentro da fatia. Então $W_i=\sum_j\gamma_j A_{ij}$, em kN/m. O método das fatias usa o braço aproximado $R\sin\alpha_i$ para o peso. Substituir esse braço pelo do centroide real do peso é outra opção e pode mudar o FS. Base que coincida com uma fronteira, material ambíguo ou área sem cobertura recebe diagnóstico explícito. Referências para corda, braços e subdivisão no §8.

Quando a linha piezométrica está ativa, calcular $u_i=\gamma_w\max(0,z_p(x_{a,i})-z_{a,i})$ em kPa. No estado seco, $u_i=0$. Definir $u_{e,i}=u_i$ para resistência efetiva e $u_{e,i}=0$ para resistência total. **[REVISAR R2]** trata o alcance do modo misto, a atribuição de pesos quando houver distinção de saturação e a aceitação de carga piezométrica acima do terreno sem lâmina externa declarada. A linha prescrita representa carga de pressão, e a presença de lâmina externa é uma condição física separada.

Para a interseção da faixa $j$ com a fatia $i$, $L_{ij}$ é o comprimento horizontal em m e $x_{q,ij}$ é seu ponto médio horizontal em m. Se $L_{ij}=0$, a contribuição é nula. Caso contrário, $Q_{ij}=q_jL_{ij}$ em kN/m. Definir $Q_i=\sum_j Q_{ij}$ e manter os braços de cada faixa.

## 3. Equações na superfície fixa

Definir $t_i=\tan\phi_i$ e a parcela motriz dividida pelo raio, em kN/m:

$$
D=\sum_i W_i\sin\alpha_i+\sum_{i,j}Q_{ij}(x_c-x_{q,ij})/R.
$$

**[REVISAR R0]** A auditoria corrigiu o sinal escrito na nota inicial. No ramo inferior, com $x$ no sentido do movimento, a rotação motriz é anti-horária no referencial local. Uma força vertical descendente gera momento motriz positivo quando $x_{q,ij}<x_c$. Em $x_{q,ij}=x_{a,i}$, vale $(x_c-x_{q,ij})/R=\sin\alpha_i$. Assim, carga e peso descendentes co-localizados têm o mesmo sinal. Uma carga alinhada ao centro tem momento nulo e ainda entra na normal. Para os dois métodos, aceitar o denominador somente se finito e $D>\tau_D$.

**Fellenius, D1.** Despreza forças entre fatias e satisfaz equilíbrio global de momentos. A normal de base usada na resistência, $N'_{O,i}$ em kN/m, é aproximada:

$$
N'_{O,i}=(W_i+Q_i-u_{e,i}b_i)\cos\alpha_i,\qquad
F_O=\frac{\sum_i(c_i\ell_i+N'_{O,i}t_i)}{D}.
$$

O termo de água é $u_{e,i}\ell_i\cos^2\alpha_i$. O equilíbrio de momentos usa o peso total e o momento próprio das sobrecargas. O método serve como referência aproximada. A variante histórica $W_i\cos\alpha_i-u_i\ell_i$ é descrita por Duncan na eq. 6.48 e pelo USACE na eq. C-13, e tem efeito diferente quando há pressão neutra. A comparação usa as fontes do §8.

**Bishop Simplificado, D1.** Usa equilíbrio vertical por fatia e equilíbrio global de momentos. Assume forças entre fatias horizontais. Seja $F>0$ uma estimativa de FS, $S_i$ a força cisalhante mobilizada em kN/m e $N_i$ a normal total em kN/m. Valem $N_i\cos\alpha_i+S_i\sin\alpha_i=W_i+Q_i$ e $F S_i=c_i\ell_i+(N_i-u_{e,i}\ell_i)t_i$. Eliminando a normal:

$$
m_i(F)=\cos\alpha_i+\sin\alpha_i\,t_i/F,\qquad
N'_{B,i}(F)=\frac{W_i+Q_i-u_{e,i}b_i-c_i\ell_i\sin\alpha_i/F}{m_i(F)},
$$

$$
G(F)=\frac{1}{D}\sum_i\frac{c_i b_i+(W_i+Q_i-u_{e,i}b_i)t_i}{m_i(F)},
\qquad F_B=G(F_B).
$$

A normal total para diagnóstico é $N_i=N'_{B,i}+u_{e,i}\ell_i$. A tensão normal usada na resistência é $\sigma_{r,i}=N'_{B,i}/\ell_i$ em Bishop e $N'_{O,i}/\ell_i$ em Fellenius, em kPa. É efetiva para material efetivo e total para material total. Para normal convergida, avaliar a regra de tração aprovada em D4. **[REVISAR R4]** propõe invalidar tração material se $\sigma_{r,i}<-\tau_t$, conservar o valor bruto e sinalizar tensão negativa dentro da tolerância. O caso de resistência global exatamente zero tem tratamento explícito em **[REVISAR R5]**.

## 4. Pseudocódigo de preparação e solução

~~~text
preparar(candidato, seção, água, faixas, perfil):
    validar círculo, interseções, cobertura e massa
    se falhar: retornar status geométrico e motivo
    gerar cortes obrigatórios e subdividir arcos acima de 3°
    para cada fatia em ordem crescente de x:
        calcular b, Δz, ℓ, α, ponto do arco, áreas por material e W
        identificar resistência na base, calcular u e u_e
        obter Q e momento de cada interseção com uma faixa
    obter D preservando o sinal de cada parcela
    retornar fatias ou erro de preparação

fellenius(fatias, D, perfil):
    exigir D finito e D > τD
    calcular as normais aproximadas e as parcelas resistentes
    classificar tensão, resistência nula e resultados não finitos
    retornar FS = soma das parcelas resistentes / D quando admissível

bishop(fatias, D, perfil):
    exigir D finito e D > τD
    F ← F0
    para k de 1 até K:
        exigir F finito e positivo
        calcular todos os m(F); se algum não for finito: retornar ERRO_NUMERICO
        se algum m(F) ≤ τm: retornar SINGULARIDADE_BISHOP [REVISAR R4]
        calcular g ← G(F)
        se alguma parcela, soma ou g não for finito: retornar ERRO_NUMERICO
        se g ≤ 0: classificar RESISTENCIA_NULA ou FS_NAO_POSITIVO [REVISAR R5]
        resíduo ← |g − F|
        se resíduo ≤ τF:
            calcular normais e parcelas por fatia no F avaliado
            conferir tração e finitude
            retornar F, resíduo, k e diagnóstico quando admissível
        se k = K: retornar SEM_CONVERGENCIA com F, g, resíduo e k
        F ← g
~~~

O teste verifica o resíduo no valor que será devolvido. Uma superfície com falha não fornece FS elegível à classificação. Os valores de tentativa permanecem como diagnóstico. Registrar se houve aceitação na primeira avaliação e distinguir a avaliação singular do simples esgotamento de $K$. A avaliação singular descreve a trajetória a partir de $F_0$. Para $\phi_i=0$ em todas as fatias, ambos os métodos têm o mesmo quociente $\sum_i c_i\ell_i/D$ na mesma superfície, desde que as verificações de admissibilidade passem.

**[REVISAR R5]** propõe usar RESISTENCIA_NULA somente quando a ausência de resistência puder ser demonstrada, como $c_i=0$ e $\phi_i=0$ em todas as fatias. Uma soma zero por cancelamento entre contribuições, ou uma atualização negativa, deve ser registrada como FS_NAO_POSITIVO. O resultado agregado deve destacar o caso de resistência nula mesmo quando outra superfície tiver FS positivo.

## 5. Busca circular, saídas e mensagens

**[REVISAR R3, R6]** propõe uma malha regular com mínimo, máximo e passo para $x_c,z_c,R$. Para cada coordenada, enumerar por índice inteiro $v=v_\min+n\Delta v$ com $n\ge0$. Exigir $\varepsilon_x<\Delta v/2$ nos eixos com passo e intervalo não nulo. Se houver índice cuja coordenada dista até $\varepsilon_x$ do máximo, normalizar apenas esse ponto para o máximo. Caso contrário, parar no último ponto dentro do intervalo, sem inserir intervalo residual. O intervalo de comprimento zero contém só seu valor. Iterar em ordem $(n_x,n_z,n_R)$. Verificar tamanho da malha antes de gerar os candidatos. O teto de candidatos, se adotado, precisa ser explícito e rejeitar a busca excedente em vez de truncá-la.

~~~text
buscar(seção, perfil, métodos):
    validar entradas e configuração uma vez
    para cada círculo em ordem estável:
        preparar a geometria uma vez
        se geometria inválida: contar o motivo e continuar
        para cada método:
            resolver o círculo e registrar resultado ou motivo
            atualizar o mínimo apenas para FS elegível estritamente menor
            em igualdade exata manter o primeiro da ordem
    para cada método:
        se nenhum círculo admissível: SEM_SUPERFICIE_ADMISSIVEL
        senão se nenhum resultado elegível: SEM_FS_VALIDO
        senão: retornar o mínimo elegível, quase empates e avisos de cobertura
~~~

Quase empate é diferença positiva de FS até $\tau_\mathrm{emp}$ e recebe aviso. A precisão exibida não interfere na seleção. Sinalizar mínimo no primeiro ou último índice efetivamente amostrado em um eixo. Registrar cobertura parcial quando algum candidato geometricamente admissível falhar no cálculo ou na admissibilidade do método. Reportar o menor FS entre os candidatos válidos avaliados, com domínio e passos usados. Cada método tem sua própria classificação. A comparação na mesma superfície pode ser feita em modo de círculo fixo.

| Diagnóstico | Condição e comportamento |
| --- | --- |
| ENTRADA_INVALIDA | Unidade, domínio, parâmetro obrigatório ou intervalo inválido. Rejeitar a análise e indicar campo. |
| CIRCULO_INADMISSIVEL | Cruzamentos, tangência, massa, corte degenerado ou cobertura de solo inválidos. Registrar círculo e motivo. |
| AGUA_SEM_COBERTURA / AGUA_EXTERNA | Indicar trecho sem linha ou condição externa que exige outro modelo. Rejeitar o caso afetado. |
| MOMENTO_MOTRIZ_INVALIDO | $D\le\tau_D$ na direção analisada. Registrar $D$ e a direção, sem classificar estabilidade. |
| SINGULARIDADE_BISHOP | Valor de $m_i$ inválido conforme R4. Registrar fatia, iteração e valor. |
| TRACAO_NA_BASE | Indicar fatia, tensão, modo de resistência e limiar. Aplicar R4 após solução. |
| RESISTENCIA_NULA / FS_NAO_POSITIVO | Identificar ausência de resistência ou atualização incompatível com o domínio do método. A elegibilidade do caso zero segue R5. |
| ERRO_NUMERICO / SEM_CONVERGENCIA | Registrar primeiro valor não finito ou término por limite, com etapa e intermediários disponíveis. |
| SEM_SUPERFICIE_ADMISSIVEL / SEM_FS_VALIDO | Distinguir falta de geometria admissível de falha das soluções por método. |
| LIMITE_DA_MALHA / COBERTURA_PARCIAL / QUASE_EMPATE | Informar o limite da amostragem, quantidade de candidatos afetados e diferenças entre superfícies, conforme o caso. |

O relatório registra unidades, sentido, materiais, condição de água, cargas, identificação da formulação, parâmetros, círculo e FS por método, estado da convergência e avisos. A trilha por fatia inclui limites, ângulo, comprimento, áreas, material e modo de resistência na base, peso, pressão calculada e usada, sobrecarga e seu braço, parcelas do denominador, normal e contribuição resistente. Em Bishop, registrar $m_i$ no valor avaliado e o resíduo global. Em busca, guardar o mínimo, contagens por motivo e os parâmetros necessários para refazer a enumeração.

## 6. Verificação para revisão

| Caso | Evidência e resultado |
| --- | --- |
| CA1 e CA3 · Geometria, unidades, água e estratos | Revisão dimensional do §1 e da derivação de forças do §3, com checagem de cenários. Em seco, $u_e=0$. Para $\gamma_w=10$ kN/m³ e carga vertical piezométrica de −1, 0 e +2 m, resultam 0, 0 e 20 kPa. Duas subáreas de 2 e 3 m² com $\gamma=18$ e 20 kN/m³ dão $W=96$ kN/m. O material da base determina a resistência, independentemente de qual subárea pesa mais. |
| CA2 · Equações | Conferidas em Duncan e USACE. Identificadas a omissão de $u$ na eq. 6.58 de Duncan e a divergência C-15 versus F-4/F-6 no USACE. Original de Bishop (1955) pendente. |
| CA3 · Sobrecarga | Com $R=10$ m, $x_c=0$, $\alpha=30^\circ$, $W=100$ kN/m e $Q=15$ kN/m, as posições $x_q=-5,0,+5$ m dão $D=57,5$, 50 e 42,5 kN/m. A parcela normal da carga permanece a mesma. Espelhar o modelo e inverter o sentido de entrada devolve as mesmas coordenadas locais e os mesmos sinais. |
| CA4 · Iteração de Bishop | Exemplo de Duncan fig. 7.40 com perfil de demonstração $F_0=1,4$, $\tau_F=10^{-6}$ e $K=20$. Avaliações com $m$ finito e positivo. Aceita $F=1,613020984$ na 5ª avaliação, com resíduo de aproximadamente $5,06\times10^{-7}$. Com $K=1$ para o mesmo caso retorna SEM_CONVERGENCIA. Os valores usados aqui pertencem ao caso de verificação. |
| CA5–CA6 · Busca e falhas | Para $R=10$ m e centro em $(0,10)$ m, a reta horizontal $z_g=2$ m cruza o ramo inferior em $x=\pm6$ m, $z_g=0$ dá tangência e $z_g=-1$ m não cruza o círculo. Revisão de mesa da busca: nenhum círculo geométrico dá SEM_SUPERFICIE_ADMISSIVEL. Círculos admissíveis, todos com falhas, dão SEM_FS_VALIDO. Para FS válidos 1,20, 1,20 e 1,19, ganha 1,19. Para dois 1,20 idênticos, mantém o primeiro. Uma falha entre resultados válidos é registrada como cobertura parcial. Entradas não finitas são rejeitadas antes da busca. $D=0$ e $m=0$ têm diagnósticos distintos. |
| CA7 · Fellenius em superfície fixa | Duncan §7.7.7, fig. 7.34, p. 154. Com $c'=100$ psf, $\phi'=30^\circ$ e colunas impressas de $W_i,\ell_i,\alpha_i,u_i$ das nove fatias, obtêm-se parcela motriz 28.822,497, coesiva 9.140 e de atrito 25.051,584 em lb por faixa de 1 ft. FS 1,186281, publicado 1,19, diferença −0,003719. |
| CA7 · Bishop em superfície fixa | Duncan §7.7.8, fig. 7.40, p. 157. Com $c'=0$ e colunas impressas de $W_i,b_i,\alpha_i,u_i,\phi'_i$ das dez fatias, obtêm-se denominador 1.891.280,560 e numerador 3.049.723,278 em lb por faixa de 1 ft para $F$ de tentativa 1,6. A raiz aproximada sem arredondar é 1,613022, publicado 1,61, diferença +0,003022. |

Para repetir o cálculo, consultar as colunas indicadas nas figuras 7.34 e 7.40 de Duncan et al. (2014), pp. 154 e 157, na ordem original das fatias. Usar o peso publicado para a faixa de 1 ft de largura fora do plano, comprimentos em ft, pressões em psf e ângulos em graus antes da conversão trigonométrica. A especificação registra os valores agregados recalculados e a iteração de Bishop.

Nos dois casos, $Q_i=0$. Os valores foram recalculados sem arredondamento intermediário. A geometria geral, a enumeração completa da busca e o tratamento de erros ainda precisam de verificação executável na #31. CA8 aguarda revisão e aceite da especificação integral.

## 7. Decisões sinalizadas para revisão de engenharia

| Flag | Proposta para esta versão | O que conferir |
| --- | --- | --- |
| **[REVISAR R0]** | Registrar a correção do braço motriz para $x_c-x_q$. | Revisar a derivação e o caso espelhado. O aceite D3 já exigia braço próprio. |
| **[REVISAR R1]** | Perfil poligonal estritamente crescente em $x$, arco inferior com dois cruzamentos transversais, área até o arco, base resistente como corda, amostragem no meio angular e braço de peso aproximado. | Tratamento de paredes verticais, vértices, tangências, fatias estreitas e base coincidente com interface. Avaliar alternativas de centroide real ou ponto médio da corda. |
| **[REVISAR R2]** | $c_i\ge0$, $0\le\phi_i<90^\circ$, propriedades efetivas ou totais identificadas por material e peso total fornecido por subárea. Lâmina externa declarada é caso fora do escopo. | Confirmar se o primeiro perfil admite modo misto, como dividir zonas com pesos totais distintos e quando aceitar piezométrica acima do terreno como carga confinada. |
| **[REVISAR R3]** | Limites, passos, tolerância geométrica e capacidade da malha explícitos. Fatia degenerada invalida o candidato com diagnóstico. | Confirmar convenção de coincidência de cortes, inclusão de extremos, tolerância, mínimo de largura e eventual teto. |
| **[REVISAR R4]** | Verificar $m_i>\tau_m$ em cada avaliação, retorno pelo resíduo no próprio $F$ e tração abaixo de $-\tau_t$ como inadmissibilidade. | Confirmar limiares e política para pequenas tensões negativas. Alternativa é tolerar ou modelar perda de contato com regras próprias. |
| **[REVISAR R5]** | Registrar resistência nula como condição crítica destacada, com exclusão do conjunto de FS positivos e aviso no resultado agregado. | Decidir se FS zero em Fellenius, quando o quociente é definido e a resistência física é nula, deve entrar na classificação. Em Bishop, o estado exige regra específica porque $m_i$ usa $1/F$. |
| **[REVISAR R6]** | Empate exato pela ordem da malha, quase empate por parâmetro explícito e precisão de exibição por perfil. | Aprovar a ordem, precisão, faixa de quase empate e política de refinamento da busca. |

## 8. Rastreabilidade e estado do passo 5

| Bloco | Fontes governantes e decisões |
| --- | --- |
| Modelo, ângulos e fatias | Duncan et al., 2ª ed., pp. 87–90, fig. 6.9, eq. 6.50, e §14.5.2, pp. 242–245. USACE §F-2a, fig. F-2, pp. F-2–F-3. D3, R1 e R3. |
| Peso, propriedades e água | Duncan §§6.5.1–6.5.2, pp. 89–91, e §6.13.5, p. 120, eq. 6.115. USACE §2-2, eq. 2-3 e §F-2b, pp. F-4 e F-6. D2 e R2. |
| Fellenius | Duncan eqs. 6.55–6.57 e 6.59, pp. 89–90. USACE fig. C-9 e eqs. C-12–C-14, pp. C-13–C-14. D1. |
| Bishop, força externa e convergência | Duncan eqs. 6.60–6.66 e 6.71–6.78, pp. 90–93, e §14.5.1, pp. 241–242. USACE eqs. C-11, C-16, F-4–F-6 e §C-10d. D1, D3–D4 e R0, R4–R5. |
| Busca, resultados e falhas | USACE §C-1g, pp. C-8–C-12, e §C-10, pp. C-33–C-38. Duncan §§7.5 e 14.1.1. D5 e R3–R6. |
| Contexto brasileiro | ABNT NBR 11682:2009, 2ª ed., §§7.3.6–7.3.7. Critérios normativos de segurança seguem reservados à análise específica conforme aceite da #29. |

[Seleção de fontes da #29](https://github.com/ricardocorsini/openstruct-front/issues/29#issuecomment-6840163130) · [Duncan, Wright e Brandon, 2ª ed., 2014](https://www.wiley.com/en-ca/soil-strength-and-slope-stability-2nd-edition-p-9781118651650) · [USACE EM 1110-2-1902](https://damtoolbox.org/images/8/83/Slope_Stability_Document.pdf).

**Pendências de fechamento.** Revisar os itens R0–R6, conferir o texto integral de Bishop (1955) quando houver acesso e obter o aceite de engenharia da especificação resultante (CA8). Esta versão é a peça para revisão do passo 5. [Artigo na editora](https://doi.org/10.1680/geot.1955.5.1.7).
