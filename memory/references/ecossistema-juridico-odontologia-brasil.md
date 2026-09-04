---
name: ecossistema-juridico-odontologia-brasil
description: Base normativa oficial para termos SaaS, LGPD, consentimento odontologico e prova eletronica na Odonto.IA.
type: reference
created: 2026-09-03
---

## Pergunta

Quais instrumentos e controles documentais devem sustentar um ecossistema de contratos da Odonto.IA que proteja a plataforma e ajude o cirurgiao-dentista a documentar adequadamente a relacao com o paciente?

## Achados (com fonte)

- O Estatuto dos Direitos do Paciente exige informacao clara, acessivel e detalhada, participacao no plano terapeutico, consentimento sem coercao, possibilidade de retirada, confidencialidade, acesso gratuito ao prontuario e tempo para decidir, salvo emergencia. — [Lei 15.378/2026](https://planalto.gov.br/ccivil_03/_ato2023-2026/2026/lei/l15378.htm)
- O Manual do Prontuario do Paciente em Odontologia do CFO (2026) trata o consentimento como processo continuo; recomenda contrato escrito individualizado, TCLE adaptado ao caso e registro reforcado em procedimentos complexos ou de alto risco. — [CFO, Manual do Prontuario 2026](https://website.cfo.org.br/wp-content/uploads/2026/03/CFO_Manual_do_Prontuario_Ebook_v2.pdf)
- O Codigo de Etica Odontologica exige prontuario legivel, atualizado, cronologico, identificado e conservado, alem de acesso e copia ao paciente. — [Resolucao CFO 118/2012](https://website.cfo.org.br/wp-content/uploads/2018/03/codigo_etica.pdf)
- Dados de saude sao dados pessoais sensiveis; controlador e operador possuem papeis diferentes e devem adotar medidas de seguranca, manter registros e respeitar direitos dos titulares. — [LGPD, Lei 13.709/2018](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm)
- Prontuarios digitalizados ou originalmente eletronicos devem preservar integridade, autenticidade, confidencialidade e protecao contra alteracao ou destruicao nao autorizada; o prazo legal minimo indicado e de 20 anos a partir do ultimo registro, ressalvadas regras especiais. — [Lei 13.787/2018](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13787.htm)
- Documento eletronico fora da ICP-Brasil pode ser admitido se o meio de comprovacao de autoria e integridade for aceito pelas partes. — [MP 2.200-2/2001, art. 10, paragrafo 2](https://www.planalto.gov.br/ccivil_03/mpv/antigas_2001/2200-2.htm)
- O provedor de aplicacao com fins economicos deve manter registros de acesso a aplicacoes, sob sigilo e seguranca, por seis meses. — [Marco Civil da Internet, Lei 12.965/2014](https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2014/lei/l12965.htm)
- Incidente com risco ou dano relevante deve ser comunicado pelo controlador a ANPD e aos titulares em tres dias uteis; o operador deve informar o controlador sem demora injustificada e fornecer as informacoes necessarias. — [ANPD, Resolucao 15/2024](https://www.gov.br/anpd/pt-br/canais_atendimento/agente-de-tratamento/comunicado-de-incidente-de-seguranca-cis)
- Transferencias internacionais baseadas em clausulas contratuais devem usar integralmente as clausulas-padrao da ANPD e ser explicadas ao titular em linguagem simples. — [ANPD, Resolucao 19/2024](https://www.gov.br/anpd/pt-br/acesso-a-informacao/institucional/atos-normativos/regulamentacoes_anpd/resolucao-cd-anpd-no-19-de-23-de-agosto-de-2024)
- Clausulas que eliminem responsabilidade legal do fornecedor podem ser nulas; limitacao de responsabilidade B2B deve ser proporcional e juridicamente revisada. — [CDC, Lei 8.078/1990](https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm)

## Inferencias de produto

- Termos de Uso, Aviso de Privacidade e Acordo de Tratamento de Dados nao devem ser um unico checkbox indiscriminado.
- O TCLE nao substitui o dialogo clinico nem pode ser texto generico igual para todos os procedimentos.
- O melhor ganho probatorio vem de documento versionado, snapshot imutavel, identificacao das partes, dupla assinatura, trilha de eventos e hash verificavel.
- Audio ambiente contendo voz do paciente exige um caminho de transparencia e autorizacao separado; ditado exclusivo do profissional reduz o risco.

## Lacunas

- Razao social, CNPJ, endereco, foro e contatos da Odonto.IA.
- Entidades juridicas, paises, regioes de processamento e termos vigentes de cada suboperador.
- Politica real de backup, retencao, exportacao, exclusao, RTO/RPO e resposta a incidentes.
- Validacao clinica, por especialidade, das listas de riscos de cada modulo de TCLE.
- Enquadramento tributario, consumerista e regulatorio da contratacao conforme publico-alvo e modelo comercial final.
