/*
The MIT License

Copyright (c) 2024 Wellington Vidal

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the “Software”), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

This project includes code from:

* **qrcode.min.js:** Copyright (c) 2020 datalog.
  Licensed under MIT License.
  Link: https://github.com/datalog/qrcode-svg
*/

let db;
const nomeBanco = "db_pde";
const tabelaProtocolos = "tbl_protocolos";

function CriaBancoDeDados()
{
    if (!window.indexedDB) {
        alert("Seu navegador não suporta IndexedDB");
    }
    else
    {
        var request = window.indexedDB.open(nomeBanco, 1);

        request.onerror = (event) => {
            console.error(`Database error: ${event.target.errorCode}`);
        };
        
        request.onsuccess = (event) => {
            db = event.target.result;
        
            ListaProtocolos();
        };
    
        request.onupgradeneeded = (event) => {
            db = event.target.result;
        
            const objectStore = db.createObjectStore(tabelaProtocolos, { keyPath: "id", autoIncrement: true });
            objectStore.createIndex("destino", "destino", { unique: false });
            objectStore.createIndex("descricao", "descricao", { unique: false });
            objectStore.createIndex("data_envio", "data_envio", { unique: false });
            objectStore.createIndex("data_recebeu", "data_recebeu", { unique: false });
            objectStore.createIndex("quem_recebeu", "quem_recebeu", { unique: false });
            objectStore.createIndex("situacao", "situacao", { unique: false });
        }
    }
}

CriaBancoDeDados();

function CadastraProtocolo()
{
    let txtDestino = document.getElementById('txtDestino');
    let txtDescricao = document.getElementById('txtDescricao');

    if ((txtDestino.value != '') && (txtDescricao.value != ''))
    {
        document.getElementById('trZero').style.display = "none";
        let dataFormatada = PegaDataHojeFormatada();
    
        //indexedDB
        const transaction = db.transaction([tabelaProtocolos], "readwrite");
        const objectStore = transaction.objectStore(tabelaProtocolos);
    
        const novoProtocolo = {
            destino: txtDestino.value, 
            descricao: txtDescricao.value, 
            data_envio: dataFormatada, 
            data_recebeu: "---", 
            quem_recebeu: "---", 
            situacao: "Pendente"
        }
    
        const request = objectStore.add(novoProtocolo);
    
        transaction.oncomplete = (event) => {
            console.log("oncomplete", event);
            alert("Protocolo Cadastrado com Sucesso!");
    
            ListaProtocolos();
            FiltraDados();
        };
        
        transaction.onerror = (event) => {
            console.log("onerror", event);
        };
    }
    else
    {
        alert('Digite o Destino e a Descrição!');
    }
}

function ListaProtocolos()
{
    LimpaTabela();
    LimpaItensDataList();

    let tabela = document.getElementById('tabela');
    document.getElementById('trZero').style.display = "none";

    const transaction = db.transaction([tabelaProtocolos], "readonly");
    const objectStore = transaction.objectStore(tabelaProtocolos);
    let qtdRegistros = 0;
    let listaDataList = [];

    objectStore.openCursor().onsuccess = function(event){
        var cursor = event.target.result;

        if (cursor)
        {
            let id = cursor.value.id;
            let situacao = cursor.value.situacao;

            let colunas = [
                `<input type='checkbox' id='CHK_${id}' class='chk_grupo'>`,
                `<button type='button' onclick=\"AbreMenuAcoes(this, '${id}', '${situacao}')\" class='btnQrCode'>?</button>`,
                cursor.value.id, 
                cursor.value.destino,
                cursor.value.descricao,
                cursor.value.data_envio,
                cursor.value.data_recebeu,
                cursor.value.quem_recebeu,
                cursor.value.situacao,
                `<button type='button' onclick=\"GeraQrCode('${id}')\" class='btnQrCode'>Qr</button>`
            ];

            let novaLinha = tabela.insertRow();

            for (let i = 0 ; i < colunas.length ; i++)
            {
                let col = novaLinha.insertCell(i);
                col.innerHTML = colunas[i];

                if (i == 4)
                {                    
                    col.innerHTML = colunas[i].replace(/[,]/g, ",\n");
                }
            }

            qtdRegistros++;

            //ADICIONA ITENS AO DATALIST (HISTÓRICO DE DESTINOS)
            let destino = cursor.value.destino.trim();

            if (listaDataList.indexOf(destino) == -1)
            {
                listaDataList.push(destino);
                AdicionaItemDataList(destino);
            }

            cursor.continue();
        }

        if (qtdRegistros == 0)
        {
            document.getElementById('trZero').style.display = "";
        }
        else
        {
            FiltraDados();
        }
    }
}

function LimpaTabela()
{
    try 
    {
        let tabela = document.getElementById('tabela');
        let trs = tabela.getElementsByTagName('tr');

        if (trs.length > 3)
        {
            for (let i = trs.length - 1 ; i > 2 ; i--)
            {
                tabela.deleteRow(i);
            }
        }
    } 
    catch (error) 
    {
        console.log(error);
    }
}

function GeraQrCode(idProtocolo)
{
    try
    {
        const transaction = db.transaction([tabelaProtocolos], "readonly");
        const objectStore = transaction.objectStore(tabelaProtocolos);

        const request = objectStore.get(Number(idProtocolo));

        request.onerror = (event) => {
            alert('Protocolo não encontrado!');
        };

        request.onsuccess = (event) => {
            const protocoloLido = event.target.result;

            let protocolo = {};
            protocolo.id = protocoloLido.id;
            protocolo.destino = protocoloLido.destino;
            protocolo.descricao = protocoloLido.descricao;
            protocolo.data_envio = protocoloLido.data_envio;
            protocolo.data_recebeu = protocoloLido.data_recebeu;
            protocolo.quem_recebeu = protocoloLido.quem_recebeu;
            protocolo.situacao = protocoloLido.situacao;

            let dadosQrCode = `Destino:${protocolo.destino}|Descrição:${protocolo.descricao}|Data Envio:${protocolo.data_envio}|Data Recebeu:${protocolo.data_recebeu}|Quem Recebeu:${protocolo.quem_recebeu}|Situação:${protocolo.situacao}|Id:${protocolo.id}|`;

            let qrCode = new QRCode({msg: dadosQrCode, ecl:'L'});
        
            let btnFecharQr = document.createElement('button');
            btnFecharQr.innerHTML = "X";
            btnFecharQr.setAttribute('style', "background-color: #ff0000; color: #ffffff; float: right;");
            btnFecharQr.addEventListener('click', FechaJanelaQr);
        
            if (document.getElementById('divJanelaQrCode'))
            {        
                FechaJanelaQr();
            }
            
            let div = document.createElement('div');
            div.setAttribute('id', 'divJanelaQrCode');
            div.setAttribute('style', "background-color: #ffffff; position: fixed; width: 300px; height: 250px; top: 50%; left: 50%; text-align: center; border: 1px solid black;");
            div.appendChild(btnFecharQr);
            div.appendChild(qrCode);
        
            document.body.append(div);
        };
    }
    catch (error) 
    {
        alert('Erro ao ler protocolo!');
    }
}

function FechaJanelaQr()
{
    try {
        let divJanelaQrCode = document.getElementById('divJanelaQrCode');
        document.body.removeChild(divJanelaQrCode);    
    } catch (error) {
        console.log('Erro ao apagar elemento!');   
    }
}

function PegaDataHojeFormatada()
{
    const dataHoje = new Date();
    let dia = dataHoje.getDate() < 10 ? '0' + dataHoje.getDate() : dataHoje.getDate();
    let mes = dataHoje.getMonth() + 1 < 10 ? '0' + (dataHoje.getMonth() * 1 + 1) : dataHoje.getMonth() + 1;
    let ano = dataHoje.getFullYear();
    
    return dia + "/" + mes + "/" + ano;
}

function PegaHoraAgoraFormatado()
{
    const dataHoje = new Date();
    let hora = dataHoje.getHours() < 10 ? '0' + dataHoje.getHours() : dataHoje.getHours();
    let minutos = dataHoje.getMinutes()< 10 ? '0' + dataHoje.getMinutes() : dataHoje.getMinutes();
    let segundos = dataHoje.getSeconds() < 10 ? '0' + dataHoje.getSeconds() : dataHoje.getSeconds();
    
    return hora + "-" + minutos + "-" + segundos;
}

function SelecionaAba(aba)
{
    let abaCadastro = document.getElementById('aba-cadastro');
    let abaConfiguracao = document.getElementById('aba-configuracao');
    let formCadastro = document.getElementById('form-cadastro');
    let formConfiguracao = document.getElementById('form-configuracao');

    if (abaCadastro == aba)
    {
        abaCadastro.setAttribute('style', "border-bottom: 1px solid #dcdcdc");
        abaConfiguracao.setAttribute('style', "border-bottom: 1px solid grey");
        formCadastro.style.display = "block";
        formConfiguracao.style.display = "none";
    }
    else if (abaConfiguracao == aba)
    {
        abaConfiguracao.setAttribute('style', "border-bottom: 1px solid #dcdcdc");
        abaCadastro.setAttribute('style', "border-bottom: 1px solid grey");
        formConfiguracao.style.display = "block";
        formCadastro.style.display = "none";
    }
}

function ValidaCampoRede(tipo, campo)
{
    let validado = false;

    if ((tipo == 'PORTA') && (!Number.isNaN(campo)))
    {
        validado = true;
    }
    else if ((tipo == 'IP') && (campo.split(".").length == 4))
    {
        validado = true;
    }

    return validado;
}

function FormataCampo(tipo, campo)
{
    if (tipo == 'IP')
    {
        campo.value = campo.value.replace(/[^0-9|.]/g, '');
    }
    else if (tipo == 'PORTA')
    {
        campo.value = campo.value.replace(/[^0-9]/g, '');
    }
    else if (tipo == 'DESTINO')
    {
        campo.value = campo.value.replace("|", '');
    }
    else if (tipo == 'DESCRICAO')
    {
        campo.value = campo.value.replace("|", '');
    }
}

function LimpaItensDataList()
{
    try 
    {
        let dataList = document.getElementById('histDestinos');
    
        for (let i = dataList.options.length - 1 ; i >= 0 ; i--)
        {
            dataList.children[i].remove();
        }
    } 
    catch (error) {
        console.log(error);   
    }
}

function AdicionaItemDataList(novoItem)
{
    try 
    {
        let dataList = document.getElementById('histDestinos');
        let op = document.createElement('option');
        op.setAttribute('value', novoItem);
        dataList.append(op);    
    } 
    catch (error) 
    {
        console.log(error);   
    }
}

function FiltraDados()
{
    let txtFiltroNum = document.getElementById('txtFiltroNum');
    let txtFiltroDestino = document.getElementById('txtFiltroDestino');
    let txtFiltroDescricao = document.getElementById('txtFiltroDescricao');
    let txtFiltroDataEnvio = document.getElementById('txtFiltroDataEnvio');
    let txtFiltroDataRecebeu = document.getElementById('txtFiltroDataRecebeu');
    let txtFiltroQuemRecebeu = document.getElementById('txtFiltroQuemRecebeu');
    let selFiltroSituacao = document.getElementById('selFiltroSituacao');
    
    let tabela = document.getElementById('tabela');
    let trs = tabela.getElementsByTagName('tr');

    let valoresCampos = [null, 
                         null,
                         txtFiltroNum.value, 
                         txtFiltroDestino.value, 
                         txtFiltroDescricao.value, 
                         txtFiltroDataEnvio.value, 
                         txtFiltroDataRecebeu.value, 
                         txtFiltroQuemRecebeu.value, 
                         selFiltroSituacao.value];

    const totalCamposBusca = valoresCampos.length - 2;
    let qtdLinhasExibidas = 0;

    for (let i = 3 ; i < trs.length ; i++)
    {
        let tds = trs[i].getElementsByTagName('td');
        let localizou = 0;

        for (let c = 2 ; c < valoresCampos.length ; c++)
        {
            if (tds[c])
            {
                if ((valoresCampos[c] == '') || (tds[c].innerHTML.indexOf(valoresCampos[c]) > -1))
                {
                    localizou++;
                }
            }
        }

        if (totalCamposBusca == localizou)
        {
            trs[i].style.display = '';
            qtdLinhasExibidas++;
        }
        else
        {
            trs[i].style.display = 'none';
        }
    }

    if (qtdLinhasExibidas == 0)
    {
        document.getElementById('trZero').style.display = '';
    }
    else
    {
        document.getElementById('trZero').style.display = 'none';
    }
}

function AbreMenuAcoes(btn, idProtocolo, situacao)
{
    let linha = btn.parentElement.parentElement;

    let divId = document.createElement('div');
    divId.innerHTML = "Protocolo: " + idProtocolo;

    let textoBtnConfirmar = "Confirma Entrega";

    if (situacao == 'Entregue')
    {
        textoBtnConfirmar = "Retornar Situação";
    }

    let divBtn1 = document.createElement('div');
    let btnConfirmar = document.createElement('button');
    btnConfirmar.innerHTML = textoBtnConfirmar;
    btnConfirmar.setAttribute('style', "width: 100%; margin-bottom: 5px; background-color: #007700; color: #ffffff;");
    btnConfirmar.addEventListener('click', function(){ConfirmaEntrega(Number(idProtocolo), 'divJanelaMenuOpcoes', situacao)});
    divBtn1.appendChild(btnConfirmar);

    let divBtn2 = document.createElement('div');
    let btnExcluir = document.createElement('button');
    btnExcluir.innerHTML = "Excluir Protocolo";
    btnExcluir.setAttribute('style', "width: 100%; background-color: #770000; color: #ffffff;");
    btnExcluir.addEventListener('click', function(){ExcluiProtocolo(Number(idProtocolo), 'divJanelaMenuOpcoes')});
    divBtn2.appendChild(btnExcluir);

    let divBotoes = document.createElement('div');
    divBotoes.setAttribute('style', "text-align: left; padding: 5px; width: 90%; float: left;");
    divBotoes.appendChild(divBtn1);
    divBotoes.appendChild(divBtn2);

    let divBtnFechar = document.createElement('div');
    divBtnFechar.setAttribute('style', "width: 10%; float: left;");
    let btnFecharMenuOpcoes = document.createElement('button');
    btnFecharMenuOpcoes.innerHTML = "X";
    btnFecharMenuOpcoes.setAttribute('style', "background-color: #ff0000; color: #ffffff; float: right;");
    btnFecharMenuOpcoes.addEventListener('click', function(){FechaJanela('divJanelaMenuOpcoes')});
    divBtnFechar.appendChild(btnFecharMenuOpcoes);

    if (document.getElementById('divJanelaMenuOpcoes'))
    {        
        FechaJanela('divJanelaMenuOpcoes');
    }
    
    let div = document.createElement('div');
    div.setAttribute('id', 'divJanelaMenuOpcoes');
    div.setAttribute('style', "background-color: #ffffff; position: absolute; width: 300px; height: 120px; top: 50%; left: 30%; text-align: center; border: 1px solid black;");
    div.appendChild(divId);
    div.appendChild(divBotoes);
    div.appendChild(divBtnFechar);

    document.body.append(div);
}

function FechaJanela(id)
{
    try {
        let divJanela = document.getElementById(id);
        document.body.removeChild(divJanela);    
    } catch (error) {
        console.log('Erro ao apagar elemento! ' + error);
    }
}

function ConfirmaEntrega(idProtocolo, idJanela, situacao)
{
    try 
    {
        FechaJanela(idJanela);

        let nome = "";
        let retornar = false;

        if (situacao == 'Pendente')
        {
            nome = prompt("Informe a quem foi entregue o protocolo de Nº: " + idProtocolo);
        }
        else
        {
            retornar = confirm('Deseja retornar o protocolo de Nº: ' + idProtocolo);
        }

        if ((situacao == 'Pendente') && ((nome == null) || (nome == "")))
        {
            alert('Entrega não confirmada!');
        }
        else if ((situacao == 'Entregue') && (!retornar))
        {
            alert('Protocolo não retornado!');
        }
        else 
        {
            let dataFormatada = PegaDataHojeFormatada();

            //indexedDB
            const transaction = db.transaction([tabelaProtocolos], "readwrite");
            const objectStore = transaction.objectStore(tabelaProtocolos);

            const request = objectStore.get(idProtocolo);

            request.onerror = (event) => {
                alert('Protocolo não encontrado!');
            };

            request.onsuccess = (event) => {
                const protocolo = event.target.result;
                let msgResposta = '';

                if (situacao == 'Pendente')
                {
                    protocolo.data_recebeu = dataFormatada;
                    protocolo.quem_recebeu = nome;
                    protocolo.situacao = 'Entregue';
                    msgResposta = 'Entrega Realizada!';
                }
                else if (situacao == 'Entregue')
                {
                    protocolo.data_recebeu = '---';
                    protocolo.quem_recebeu = '---';
                    protocolo.situacao = 'Pendente';
                    msgResposta = 'Entrega Retornada!';
                }

                const requestUpdate = objectStore.put(protocolo);

                requestUpdate.onerror = (event) => {
                    alert('Erro ao confirmar entrega!');
                };

                requestUpdate.onsuccess = (event) => {
                    alert(msgResposta);

                    ListaProtocolos();
                    FiltraDados();
                };
            };
        }
    } 
    catch (error) 
    {
        alert('Erro ao confirmar entrega!');
    }
}

function ExcluiProtocolo(idProtocolo, idJanela)
{
    try
    {
        FechaJanela(idJanela);

        if (confirm('Deseja excluir o protocolo de Nº: ' + idProtocolo))
        {
            //indexedDB
            const transaction = db.transaction([tabelaProtocolos], "readwrite");
            const objectStore = transaction.objectStore(tabelaProtocolos);

            const request = objectStore.delete(idProtocolo);

            request.onsuccess = (event) => {
                alert('Protocolo Excluído com Sucesso!');

                ListaProtocolos();
                FiltraDados();
            };
        }
        else
        {
            alert('Protocolo Não Excluído!');
        }
    }
    catch (error)
    {
        alert('Erro ao excluir protocolo!');
    }
}

function SelecionaTodos()
{
    const chkTodos = document.getElementById('chkTodos');
    let chkGrupo = document.getElementsByClassName('chk_grupo');

    try 
    {
        //DESMARCA TODOS, INCLUINDO OCULTOS
        for (let c = 0 ; c < chkGrupo.length ; c++)
        {
            chkGrupo[c].checked = false;
        }

        //MARCA TODOS OS VISÍVEIS
        for (let c = 0 ; c < chkGrupo.length ; c++)
        {
            if (chkGrupo[c].parentElement.parentElement.style.display == '') //TR
            {
                chkGrupo[c].checked = chkTodos.checked;
            }
        }
    }
    catch(e)
    {
        alert('Erro ao selecionar!');
    }
}

function ExportaRelatorio()
{
    let selExportar =  document.getElementById('selExportar');
    let chkGrupo = document.getElementsByClassName('chk_grupo');
    let listaIdProtocolosSelecionados = [];

    try 
    {
        //PEGA PROTOCOLOS SELECIONADOS
        for (let c = 0 ; c < chkGrupo.length ; c++)
        {
            if ((chkGrupo[c].checked) && (chkGrupo[c].parentElement.parentElement.style.display == ''))
            {
                let id = Number(chkGrupo[c].getAttribute('id').replace('CHK_', ''));
    
                listaIdProtocolosSelecionados.push(id);
            }
        }

        if (listaIdProtocolosSelecionados.length > 0)
        {
            let listaProtocolos = [];
        
            const transaction = db.transaction([tabelaProtocolos], "readonly");
            const objectStore = transaction.objectStore(tabelaProtocolos);
        
            objectStore.openCursor().onsuccess = function(event){
                var cursor = event.target.result;
        
                if (cursor)
                {
                    if (listaIdProtocolosSelecionados.indexOf(cursor.value.id) != -1)
                    {
                        let objProtocolo = {id: cursor.value.id, 
                                            destino: cursor.value.destino.trim(), 
                                            descricao: cursor.value.descricao.trim(), 
                                            data_envio: cursor.value.data_envio, 
                                            data_recebeu: cursor.value.data_recebeu,
                                            quem_recebeu: cursor.value.quem_recebeu, 
                                            situacao: cursor.value.situacao};
        
                        listaProtocolos.push(objProtocolo);
                    }
        
                    cursor.continue();
                }
                else
                {
                    let formato = '';
                    let dadosRelatorio = '';

                    if (selExportar.value == 'XML')
                    {
                        //PREPARA ARQUIVO XML
                        let xml = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>";
                        xml += "<protocolos>";

                        for (let p = 0 ; p < listaProtocolos.length ; p++)
                        {
                            let protocolo = listaProtocolos[p];
                            xml += "<protocolo>";

                            for (let i = 0 ; i < Object.keys(protocolo).length ;  i++)
                            {        
                                let tag = Object.keys(protocolo)[i];
                                let valor = protocolo[tag];
                                
                                xml += "<" + tag + ">" + valor + "</" + tag + ">";
                            }

                            xml += "</protocolo>";
                        }

                        xml += "</protocolos>";

                        formato = 'XML';
                        dadosRelatorio = xml;
                    }
                    else if (selExportar.value == 'HTML')
                    {
                        //PREPARA ARQUIVO PDF
                        let pdf = '<!DOCTYPE html>';
                        pdf += '<html>';
                        pdf += '<head>';
                        pdf += '<title>Relatório PDF</title>';
                        pdf += "<style>*{box-sizing: border-box;}.div-tabela{margin: auto;margin-top: 30px;margin-bottom: 10px;padding: 5px;width: 90%;overflow-x: scroll;overflow-y: scroll;} table {border-collapse: collapse;} table, th, td {border: 1px solid;text-align: center;} .tr-cabecalho{background-color: #007700;color: #ffffff;}</style>";
                        pdf += '</head>';
                        pdf += '<body>';
                        pdf += "<div class='div-tabela'>";
                        pdf += "<div style=\"margin-bottom: 20px;\"><button type='button' onclick=\"Imprimir()\">Imprimir</button></div>";
                        pdf += '<table>';
                        pdf += "<tr class='tr-cabecalho'><th colspan='11'>Lista de Protocolos de Entrega</th></tr>";
                        pdf += "<tr class='tr-cabecalho'>";

                        //CRIA CABECALHO
                        let cabecalho = ['Nº', 'Destino', 'Descrição', 'Data Envio', 'Data Recebeu', 'Quem Recebeu', 'Situação', 'QR Code'];
                        
                        for (let c = 0 ; c < cabecalho.length ;  c++)
                        {        
                            let tag = cabecalho[c];
                            pdf += "<th>" + tag + "</th>";
                        }

                        pdf += "</tr>";

                        for (let p = 0 ; p < listaProtocolos.length ; p++)
                        {
                            pdf += "<tr>";

                            let protocolo = listaProtocolos[p];
                            
                            for (let i = 0 ; i < Object.keys(protocolo).length ;  i++)
                            {        
                                let tag = Object.keys(protocolo)[i];
                                let valor = protocolo[tag];
                                
                                pdf += "<td>" + valor + "</td>";
                            }

                            //INCLUI QRCODE
                            let dadosQrCode = `Destino:${protocolo.destino}|Descrição:${protocolo.descricao}|Data Envio:${protocolo.data_envio}|Data Recebeu:${protocolo.data_recebeu}|Quem Recebeu:${protocolo.quem_recebeu}|Situação:${protocolo.situacao}|Id:${protocolo.id}|`;
                            let qrCode = new QRCode({msg: dadosQrCode, ecl:'L'});

                            let div = document.createElement('div');
                            div.setAttribute('style', "background-color: #ffffff; position: fixed; width: 60px; height: 50px; top: 50%; left: 50%; text-align: center; border: 1px solid black;");
                            div.appendChild(qrCode);
                            
                            pdf += "<td onclick=\"MostraQrcode(this)\"><div style=\"display: none;\">" + div.innerHTML  + "</div><div style=\"cursor: pointer;\">Mostrar</div></td>";

                            pdf += "</tr>";
                        }

                        pdf += '</table>';
                        pdf += '</div>';
                        pdf += "<script>function MostraQrcode(td){for(let c=0;c<td.children.length;c++){if(td.children[c]){if (td.children[c].style.display == 'none'){td.children[c].style.display = '';}else{td.children[c].style.display = 'none';}}}}function Imprimir(){window.print();}</script>";
                        pdf += '</body>';
                        pdf += '</html>';

                        formato = 'HTML';
                        dadosRelatorio = pdf;
                    }

                    //INICIA DOWNLOAD DO ARQUIVO
                    const dataHoje = PegaDataHojeFormatada().replace(/[\/]/g, '_');
                    const horaAgora = PegaHoraAgoraFormatado().replace(/[-]/g, '_');

                    const nomeArquivo = `PE_${formato}_${dataHoje}_${horaAgora}.${formato.toLowerCase()}`;
                    const blob = new Blob([dadosRelatorio], { type: `text/${formato.toLowerCase()}` });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');

                    a.setAttribute('href', url);
                    a.setAttribute('download', nomeArquivo);
                    a.style.display = 'none';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                }
            }
        }
        else
        {
            alert("Nenhum protocolo foi selecionado!");
        }
    }
    catch (e) 
    {
        alert("Erro ao gerar XML!");
        console.log(e);
    }
}
