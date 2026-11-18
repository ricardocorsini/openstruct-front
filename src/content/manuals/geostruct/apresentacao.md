# Primeiros passos no GeoStruct

O GeoStruct 0.2.0 modela seções geotécnicas em 2D e calcula fatores de segurança de taludes com Fellenius e Bishop Simplificado. Veja as opções de instalação na [página do GeoStruct](/apps/geostruct#instalar).

## Calcular o projeto padrão

1. Na tela inicial ou em **Arquivo → Projeto**, escolha **Abrir projeto padrão**. O exemplo traz dois solos, uma linha piezométrica prescrita e uma sobrecarga de 20 kPa na crista.
2. No caso **Talude — busca circular**, clique em **Iniciar busca circular** para avaliar as 27 combinações de centro e raio. Abra **Ver círculos avaliados** para consultar os resultados e os diagnósticos por candidato.
3. Para examinar uma superfície específica, escolha **Talude — círculo fixo** na árvore. Use **Preparar fatias** e execute cada método. Confira os pesos, as pressões, as forças e os momentos nas fatias.

## Conferir e salvar um modelo

Em **Análise → Conferir modelo**, revise as pendências da seção e do caso ativo. Verifique os materiais, a condição de água, as faixas de sobrecarga e o sentido de movimento antes de calcular. Na busca, o menor fator de segurança de cada método depende dos círculos admissíveis, dos passos e dos limites da malha avaliados.

Use **Salvar como** para guardar as entradas em `.geo.json`. Os resultados e os perfis numéricos ficam na sessão. Exporte o relatório de entradas em HTML ou imprima em PDF. Para compartilhar o desenho, exporte a vista em SVG.

## Fontes

- [Guia de uso do GeoStruct 0.2.0](https://github.com/ricardocorsini/geo-struct/blob/6fe17367ba9bf85d8ddccc42cbba23631ae58253/docs/GUIA-DE-USO.md)
- [Malha, classificação e diagnósticos da busca circular](https://github.com/ricardocorsini/geo-struct/blob/6fe17367ba9bf85d8ddccc42cbba23631ae58253/docs/BUSCA-CIRCULAR.md)
