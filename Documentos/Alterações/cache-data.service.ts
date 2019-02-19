import { CandidatoGerenciaService } from './../candidato/candidato-gerencia.service';
import { Injectable } from '@angular/core';
import { FormGroup, FormBuilder, FormControl, Validators } from '@angular/forms';
import { CartaoPesquisa } from 'app/core/ciee-vagas/cartao/cartao-pesquisa.model';
import { ListaCartoesService } from 'app/core/ciee-vagas/cartao/listagem-cartoes.service';
import { PerfilCandidato } from '../enums/PerfilCandidato';
import { SessionService } from 'app/core/session/session.service';

@Injectable()
export class CacheDataService {

  private dadosFormPesquisaInicial: FormGroup;
  // Lista de candidatos selecionados.
  private listaLCS: CartaoPesquisa[] = [];
  public listaFavoritos: CartaoPesquisa[] = [];

  public listaCandidatosVaga: CartaoPesquisa[] = [];
  /**
   * É necessário uma área(única) profissional
   *
   * @memberof CacheDataService
   */
  public areaProfissionalParaAberturaVaga: any;
  public localCapacitacaoParaAberturaVaga: any;
  // Permitir habilitar a selecao de um card no painel de seleção para abertura de vagas
  public habilitarSelecaoCardParaAberturaVaga: boolean;


  private listaCandidatosComparar: CartaoPesquisa[] = [];


  constructor(
    private formBuilder: FormBuilder,
    private listaCartoesService: ListaCartoesService,
    private candidatoGerenciaService: CandidatoGerenciaService,
    private sessionService: SessionService
  ) {
    const ufControl = new FormControl('', [
      Validators.required
    ]);
    const cidadeControl = new FormControl('');
    const bairroControl = new FormControl('');
    bairroControl.disable();
    const enderecoCompletoControl = new FormControl('');
    enderecoCompletoControl.disable();
    const logradouroControl = new FormControl('');
    logradouroControl.disable();
    const cepControl = new FormControl('');
    cepControl.disable();
    const latControl = new FormControl('');
    latControl.disable();
    const lngControl = new FormControl('');
    lngControl.disable();
    const geoHashControl = new FormControl('');
    geoHashControl.disable();
    const periodoControl = new FormControl('');
    periodoControl.disable();
    const localCapControl = new FormControl('');
    localCapControl.disable();

    // Controles de Perfil de Estudantes
    const idPerfilControl = new FormControl('', [Validators.required]);
    idPerfilControl.disable();
    const descricaoPerfilControl = new FormControl('', [Validators.required]);

    this.dadosFormPesquisaInicial = this.formBuilder.group({
      endereco: this.formBuilder.group({
        lat: latControl,
        lng: lngControl,
        geohash: geoHashControl,
        endereco_completo: enderecoCompletoControl,
        uf: ufControl,
        cidade: cidadeControl,
        bairro: bairroControl,
        cep: cepControl,
        logradouro: logradouroControl,
      }),
      re_captcha: this.formBuilder.group({
        recaptchaReactive: [null, Validators.required]
      }),
      perfil_estudante: this.formBuilder.group({
        valor: idPerfilControl,
        descricao: descricaoPerfilControl
      }),
      nivel_ensino: this.formBuilder.group({
        nivel: [''],
        periodo: periodoControl,
        area_profissional: [''],
        areas_atuacao: [''],
        area_atuacao: [''],
        locais_capacitacao: localCapControl,
      }),
    });

    //  listaCartoesService.obterIdsFavoritos('/vagas/candidatos/favoritos').then((resultado) => {
    //   if (resultado) {
    //     this.listaCartoesService.obterFavoritosPorIds(resultado, '/student/vagas/candidatos/favoritos').then((favoritos) => {
    //       this.listaFavoritos = favoritos.content;
    //     })
    //   }
    // });

  }

  reiniciaConsultaCandidatoForm() {
    Object.keys(this.dadosFormPesquisaInicial.controls).forEach(element => {
      console.log('ele => ', element)
      if (element !== 're_captcha') {
        this.dadosFormPesquisaInicial.get(element).reset();
      }
    });
  }

  aplicarDados(valores: any): void {
    this.dadosFormPesquisaInicial = valores;
  }

  obterDados(): any {
    return this.dadosFormPesquisaInicial;
  }

  public get perfilAprendiz() {
    if (this.dadosFormPesquisaInicial &&
      this.dadosFormPesquisaInicial.get('perfil_estudante') &&
      this.dadosFormPesquisaInicial.get('perfil_estudante').get('valor') &&
      this.dadosFormPesquisaInicial.get('perfil_estudante').get('valor').value) {
      return this.dadosFormPesquisaInicial.get('perfil_estudante').get('valor').value === PerfilCandidato.Aprendiz;
    }
  }

  adicionarLCS(candidato: CartaoPesquisa): boolean {
    const indiceLista = this.listaLCS.findIndex(c => c.codigoNome === candidato.codigoNome);

    if (indiceLista === -1) {
      this.listaLCS.push(candidato);
      console.log('Candidato adicionado com sucesso!');
      return true;
    } else {
      console.log('Candidato já esta na lista!');
      return false;
    }
  }

  removerLCS(candidato: CartaoPesquisa): boolean {
    const indiceLista = this.listaLCS.findIndex(c => c.codigoNome === candidato.codigoNome);
    if (indiceLista !== -1) {
      this.listaLCS.splice(indiceLista, 1);
      console.log('Candidato removido com sucesso!');
      return true;
    } else {
      console.log('Candidato não encontrado.');
      return false;
    }
  }

  limparLista() {
    // for (let i = 0; i <= this.listaLCS.length; i++) {
    this.listaLCS.splice(0, this.listaLCS.length);
    // }
  }

  obterListaLCS(): CartaoPesquisa[] {
    return this.listaLCS;
  }

  limparListaLCS() {
    this.listaLCS = [];
  }

  adicionarListaCandidatosComparar(candidato: CartaoPesquisa): boolean {
    const indiceLista = this.listaCandidatosComparar.findIndex(c => c.codigoNome === candidato.codigoNome);
    if (indiceLista !== -1) {
      return;
    }

    if (this.listaCandidatosComparar.length < 3) {
      this.listaCandidatosComparar.push(candidato);
      return true;
    } else {
      return false;
    }
  }

  removerCandidatoListaComparar(candidato: CartaoPesquisa): void {
    const index = this.listaCandidatosComparar.findIndex(f => f.codigoNome === candidato.codigoNome);
    if (index !== -1) {
      this.listaCandidatosComparar.splice(index, 1);
    }
  }

  obterListaCandidatoComparar(): CartaoPesquisa[] {
    return this.listaCandidatosComparar;
  }

  limparListaCandidatoComparar() {
    this.listaCandidatosComparar = [];
  }

  preencherListaFavoritos(listaFavoritos) {
    this.listaFavoritos = listaFavoritos;
  }

  obterListaFavoritos(): CartaoPesquisa[] {
    return this.listaFavoritos;
  }

  adicionarFavoritos(candidato: CartaoPesquisa): boolean {
    const user = this.sessionService.currentUser;
    if (user) {
      if (candidato) {
        const indiceLista = this.listaFavoritos.findIndex(c => c.codigoNome === candidato.codigoNome);
        if (indiceLista === -1) {
          this.listaFavoritos.push(candidato);
          this.candidatoGerenciaService.favoritar(candidato.id).subscribe();
          console.log('Candidato adicionado com sucesso!');
          return true;
        } else {
          this.listaFavoritos.splice(indiceLista, 1);
          this.candidatoGerenciaService.desFavoritar(candidato.id).subscribe();
          console.log('Candidato já esta na lista!');
          return false;
        }
      }
    }
  }

  limparSelecaoAberturaVagas() {
    this.listaLCS.forEach(candidato => {
      delete candidato['selecionadoParaVaga'];
      delete candidato['habilitarSelecaoCardParaAberturaVaga'];
    });
    this.listaCandidatosVaga.forEach(candidato => {
      delete candidato['selecionadoParaVaga'];
      delete candidato['habilitarSelecaoCardParaAberturaVaga'];
    });
    this.listaCandidatosVaga = [];
    this.areaProfissionalParaAberturaVaga = null;
  }

  removerCandidatoVaga(candidato: CartaoPesquisa): boolean {
    const indiceLista = this.listaCandidatosVaga.findIndex(c => c.codigoNome === candidato.codigoNome);
    if (indiceLista !== -1) {
      delete candidato['selecionadoParaVaga'];
      delete candidato['habilitarSelecaoCardParaAberturaVaga'];
      this.listaLCS.map(f => {
        if (f.codigoNome === candidato.codigoNome) {
          delete f['selecionadoParaVaga'];
          delete f['habilitarSelecaoCardParaAberturaVaga'];
        }
      });
      this.listaCandidatosVaga.splice(indiceLista, 1);
      return true;
    } else {
      return false;
    }
  }
}
