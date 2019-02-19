// tslint:disable:max-line-length
import {
  Component,
  OnInit,
  Output,
  EventEmitter,
  ViewChild,
  KeyValueDiffers,
  KeyValueChangeRecord,
  DoCheck
} from '@angular/core';
import { FormGroup, FormBuilder, FormControl } from '@angular/forms';
import { CacheDataService } from 'app/core/ciee-vagas/cache-data/cache-data.service';
import { Router } from '@angular/router';
import { User } from 'app/core/ciee-core/user/user.model';
import { CandidatoGerenciaService } from 'app/core/ciee-vagas/candidato/candidato-gerencia.service';
import { SessionService } from 'app/core/session/session.service';
import { CarrinhoCandidatosComponent } from 'app/vagas/buscar-candidatos/componentes/carrinho-candidatos/carrinho-candidatos.component';
import { CartaoPesquisaService } from 'app/core/ciee-vagas/cartao/cartao-pesquisa.service';
import { CartaoPesquisa } from 'app/core/ciee-vagas/cartao/cartao-pesquisa.model';
import { AccessControlService } from 'app/core/access-control/access-control.service';
import { BsModalService } from 'ngx-bootstrap/modal';
import { BsModalRef } from 'ngx-bootstrap';
import { ModalCapturaUsuarioComponent } from 'app/vagas/buscar-candidatos/componentes/modal-captura-usuario/modal-captura-usuario.component';
import { ModalComponent } from 'app/ui/modal/modal/modal.component';
import { Filtro } from 'app/core/ciee-vagas/gravador-filtros/filtro/filtro.model';
import { PermissionService } from 'app/core/ciee-permission/permission.service';
import { ListaCartoesService } from 'app/core/ciee-vagas/cartao/listagem-cartoes.service';
import { AnalisadorIteracoes } from 'app/core/ciee-vagas/analisador-iteracoes/analisador-iteracoes';
import { GravadorFiltrosService } from 'app/core/ciee-vagas/gravador-filtros/gravador-filtros.service';
import { ModalAcessoRestritoComponent } from 'app/ui/modal-acesso-restrito/modal-acesso-restrito.component';
import { CursoService } from 'app/core/ciee-vagas/cursos/curso.service';
import { Curso } from 'app/core/ciee-vagas/cursos/curso.model';
import { UtilsService } from 'app/core/utils/utils.service';
import { ComponentPaginaPadrao } from 'app/ui/page/component-pagina-padrao';
import * as moment from 'moment';
// tslint:enable:max-line-length

enum TipoVisualizacao {
  Cartoes = 'CARTOES',
  Lista = 'LISTA',
  Mapa = 'MAPA'
}

enum PainelAtivo {
  Selecionados = 'candidatos-selecionados',
  Buscados = 'candidatos-buscados'
}

@Component({
  templateUrl: './listar-candidatos.component.html',
  styleUrls: ['./listar-candidatos.component.scss']
})
export class ListarCandidatosComponent extends ComponentPaginaPadrao implements OnInit, DoCheck {

  PainelAtivoEnum = PainelAtivo;
  TipoVisualizacaoEnum = TipoVisualizacao;

  admin = false;
  backOfficeEmpresa = false;
  backOfficeVagas = false;
  backOfficePCDVagas = false;
  usuarioLogado = false;
  tipoUsuarioLogado: string;

  get classeAcaoBotao(): string {
    let classeBotao = '';
    if (this.painelAtivo === PainelAtivo.Selecionados) {
      classeBotao = 'cancelar';
    } else if (this.painelAtivo === PainelAtivo.Buscados) {
      classeBotao = 'concluir';
    }
    return classeBotao;
  }
  get textoAcaoBotao(): string {
    let textoBotao = '';
    if (this.cacheDataService.obterListaLCS().length > 0) {
      if (this.painelAtivo === PainelAtivo.Selecionados) {
        textoBotao = 'Voltar à seleção de candidatos';
      } else if (this.painelAtivo === PainelAtivo.Buscados) {
        textoBotao = '+ Abrir vaga a partir de candidatos selecionados';
      }
    }
    return textoBotao;
  }

  @ViewChild('carrinhoCandidatos')
  carrinhoCandidatos: CarrinhoCandidatosComponent;
  @ViewChild('modalCapturaUsuarioComponent')
  modalCapturaUsuarioComponent: ModalCapturaUsuarioComponent;
  @ViewChild('visualizarCVModal') visualizarCVModal: ModalComponent;

  @ViewChild('acessoRestrito') acessoRestrito: ModalAcessoRestritoComponent;

  filtros: FormGroup = new FormGroup({});
  form: FormGroup;
  formValores: FormGroup;
  formPaginacao: FormGroup;
  perfil: string;
  latForm = 0;
  lngForm = 0;
  geohash = '';
  perfilSelecionado = '';
  isLoading = true;
  carregandoMais = false;
  user: User;
  toggle = {};
  pagina = 0;
  ultimaPagina = false;
  qntPaginas: number;
  paginas: number[] = [];
  detalhesCandidato: any;
  exibirDetalhes = false;
  tipoVisualizacao = TipoVisualizacao.Cartoes;
  numeroFavoritos = 0;
  visualizando = 0;
  total = 0;
  listaCandidatos: CartaoPesquisa[];
  listaLCS: CartaoPesquisa[] = [];
  listaCandidatosSelecionados: number[] = [];


  movendo = false;
  public differ: any;
  public inicializado = false;
  public modalRef: BsModalRef;
  public mostrarFiltro = false;

  idCandidatoSelecionado: number;

  painelAtivo = PainelAtivo.Buscados;
  public listaCandidatosComparar: CartaoPesquisa[] = [];
  mensagemErro = '';
  mensagemAviso = '';
  paddingBottomListaCards: (string) = '230px';

  constructor(
    private fb: FormBuilder,
    private fbPaginacao: FormBuilder,
    protected cacheDataService: CacheDataService,
    private router: Router,
    private cartaoPesquisaService: CartaoPesquisaService,
    private cursoService: CursoService,
    private accessControlService: AccessControlService,
    private analisadorIteracoes: AnalisadorIteracoes,
    private modalService: BsModalService,
    private listaCartoesService: ListaCartoesService,
    private permissionService: PermissionService,
    private differs: KeyValueDiffers,
    private utilsService: UtilsService
  ) {
    super(modalService);
    // store the initial value to compare with
    this.differ = this.differs.find(this.listaLCS).create();
  }

  ngOnInit() {
    this.atualizarPermissoes();
    this.formValores = this.cacheDataService.obterDados();
    this.formPaginacao = this.fbPaginacao.group({
      itensPorPagina: new FormControl('20'),
      pagina: new FormControl('0')
    });

    this.atualizarListaLCS();
    if (this.formValores.valid) {
      this.criarForm();
      this.latForm = this.formValores.get('endereco').get('lat').value;
      this.lngForm = this.formValores.get('endereco').get('lng').value;
      this.geohash = this.formValores.get('endereco').get('geohash').value;
      this.perfilSelecionado = this.formValores
        .get('perfil_estudante')
        .get('valor').value;
      this.montarFormFiltros();

      if (this.formValores) {
        this.analisadorIteracoes
          .avaliaContatoDiretoFiltroInicial(() => {
            const filtros = this.montarFiltroServico();
            this.obterListaCandidatos(filtros);
          },
            this.montarFiltroServico())
          .catch(() => this.chamaModal());
      }
    }
    this.inicializado = true;
  }

  atualizaAltura(valor: boolean) {
    if (valor) {
      this.paddingBottomListaCards = '230px';
    } else {
      this.paddingBottomListaCards = '0px';
    }
  }

  ngDoCheck() {
    const changesLCS = this.differ.diff(this.listaLCS); // check for changes
    if (changesLCS && this.inicializado) {
      changesLCS.forEachChangedItem(
        (record: KeyValueChangeRecord<any, any>) => {
          this.atualizarListaLCS();
          if (this.carrinhoCandidatos) {
            this.carrinhoCandidatos.atualizarCarrinho();
          }
          this.atualizarPropriedadeCarrinho();
        }
      );
      changesLCS.forEachRemovedItem(
        (record: KeyValueChangeRecord<any, any>) => {
          this.atualizarListaLCS();
          if (this.carrinhoCandidatos) {
            this.carrinhoCandidatos.atualizarCarrinho();
            this.carrinhoCandidatos.ativarastreamento();
          }
          this.atualizarPropriedadeCarrinho();
        }
      );
      changesLCS.forEachAddedItem((record: KeyValueChangeRecord<any, any>) => {
        this.atualizarListaLCS();
        if (this.carrinhoCandidatos) {
          this.carrinhoCandidatos.atualizarCarrinho();
          this.carrinhoCandidatos.ativarastreamento();
        }
        this.atualizarPropriedadeCarrinho();
      });
    }
  }

  atualizarPermissoes() {
    if (this.accessControlService.hasToken()) {
      this.usuarioLogado = true;
      this.tipoUsuarioLogado = null;
      if (this.permissionService.temPermissao('vag_bo_pcd')) {
        this.backOfficePCDVagas = true;
        this.tipoUsuarioLogado = 'backOfficePCDVagas';
      } else {
        this.backOfficePCDVagas = false;
      };
      if (this.permissionService.temPermissao('vag_emp')) {
        this.backOfficeEmpresa = true;
        this.tipoUsuarioLogado = 'backOfficeEmpresa';
      } else {
        this.backOfficeEmpresa = false;
      };
      if (this.permissionService.temPermissao('vag_bo')) {
        this.backOfficeVagas = true;
        this.tipoUsuarioLogado = 'backOfficeVagas';
      } else {
        this.backOfficeVagas = false;
      };
      if (this.backOfficePCDVagas && this.backOfficeEmpresa && this.backOfficeVagas) {
        this.admin = true;
        this.tipoUsuarioLogado = 'admin';
      } else {
        this.admin = false;
      };
    }
  }

  atualizarPropriedadeCarrinho() {
    (this.listaCandidatos || []).map(m => {
      const index = this.listaLCS.findIndex(f => f.id === m.id);
      if (index !== -1) {
        m.selecionado = true;
      } else {
        m.selecionado = false;
      }
    });
  }

  atualizarPropriedadeComparando() {
    (this.listaCandidatos || []).map(m => {
      const index = this.cacheDataService
        .obterListaCandidatoComparar()
        .findIndex(f => f.id === m.id);
      if (index !== -1) {
        m.comparando = true;
      } else {
        m.comparando = false;
      }
    });
  }

  limparEndereco(propriedade: string) {
    const propEndereco = this.formValores.get('endereco').get(propriedade);
    if (
      propEndereco &&
      (propEndereco.value === '' ||
        propEndereco.value === null ||
        propEndereco.value === undefined)
    ) {
      this.formValores.get('endereco').reset();
      this.formValores.get('perfil_estudante').reset();
      this.cacheDataService.aplicarDados(this.formValores);
    }
  }

  // TODO: colocar o tratamento do erro via toaster
  obterListaCandidatos(filtros: Filtro): void {
    this.isLoading = true;
    this.listaCandidatos = new Array<CartaoPesquisa>();
    const pagina = this.formPaginacao.get('pagina').value;
    const itensPorPagina = this.formPaginacao.get('itensPorPagina').value;
    this.listaCartoesService
      .obterListaCartoes(filtros, Number(pagina), itensPorPagina)
      .finally(() => { this.isLoading = false; })
      .subscribe(
        resultadoCartoes => {
          this.listaCandidatos = resultadoCartoes.content;
          this.visualizando = resultadoCartoes.numberOfElements;
          this.total = resultadoCartoes.totalElements;
          this.pagina = resultadoCartoes.number;
          this.ultimaPagina = resultadoCartoes.last;
          this.qntPaginas = resultadoCartoes.totalPages;
          // for (let i = 1; i <= this.qntPaginas; i++) {
          //   this.paginas.push(i);
          // }
          this.atualizarPropriedadeCarrinho();
          this.atualizarPropriedadeComparando();
        },
        err => {
          this.mensagemErro = this.utilsService.parseErrorMessage(err)
        }
      );
  }

  proximaPagina() {
    if (this.pagina + 1 < this.qntPaginas) {
      this.pagina++;
      this.formPaginacao.get('pagina').setValue(this.pagina);
      this.aplicarFiltros();
    }
  }

  paginaAnterior() {
    if (this.pagina - 1 >= 0) {
      this.pagina--;
      this.formPaginacao.get('pagina').setValue(this.pagina);
      this.aplicarFiltros();
    }
  }

  mudarPagina(event) {
    this.pagina = this.formPaginacao.get('pagina').value;
    if (this.pagina >= 0 || this.pagina <= this.qntPaginas) {
      this.aplicarFiltros();
      this.formPaginacao.get('pagina').value(this.pagina);
    }
  }

  public retornarPerfil(perfil: string): string {
    this.perfil = perfil;
    switch (perfil) {
      case 'A':
        return 'APPRENTICE';
      case 'E':
        return 'INTERNSHIP';
    }
  }

  abrirModalAcessoRestrito() {
    const config = {
      backdrop: true,
      ignoreBackdropClick: true,
      class: 'modal-lg'
    };
    this.modalRef = this.modalService.show(
      ModalAcessoRestritoComponent,
      config
    );
    this.modalRef.content.onClose = () => {
      this.atualizarPermissoes();
      this.modalRef.hide();
    };
  }

  public criarForm() {
    this.form = this.fb.group({
      mapa: this.fb.group({
        lt: [''],
        lng: [''],
        geohash: ['']
      })
    });
  }

  public listarCursos(idAreaProfissional): Curso[] {
    if (idAreaProfissional && this.perfilSelecionado === 'E') {
      this.cursoService
        .listarCursosAreaProfissional(idAreaProfissional)
        .subscribe(cursos => {
          cursos.map(m => {
            m['selecionado'] = true;
            return m;
          });

          return cursos;
        });
    }
    return [];
  }

  public montarFormFiltros() {
    let nivelEnsino, idAreaProfissional, idAreaAtuacao, locaisCapacitacao;
    nivelEnsino = this.formValores.get('nivel_ensino').value.nivel
      ? this.formValores.get('nivel_ensino').value.nivel.valor
      : '';
    if (this.perfilSelecionado === 'E') {
      idAreaProfissional = this.formValores
        .get('nivel_ensino')
        .get('area_profissional').value.valor;
    } else if (this.perfilSelecionado === 'A') {
      idAreaAtuacao = this.formValores.get('nivel_ensino').get('area_atuacao')
        .value.valor;
      locaisCapacitacao = this.formValores
        .get('nivel_ensino')
        .get('locais_capacitacao').value;
    }

    this.filtros = this.fb.group({
      relevancia: '',
      localizacao: [
        {
          value: (this.formValores.get('endereco') as FormGroup).getRawValue(),
          disabled: true
        }
      ],
      perfil: [
        {
          value: {
            codigo: this.perfilSelecionado,
            descricao: this.formValores.get('perfil_estudante').value.descricao
          },
          disabled: true
        }
      ],
      nivelEnsino: nivelEnsino,
      areaProfissional: idAreaProfissional,
      areaAtuacaoAprendiz: idAreaAtuacao,
      locaisCapacitacao: new FormControl(locaisCapacitacao),
      latitudeRef: this.latForm,
      longitudeRef: this.lngForm,
      palavraChave: this.fb.group({
        conteudo: '',
        ondeBuscar: '',
        camposEspecificos: '',
        todasAsPalavras: '',
        palavrasExatas: ''
      }),
      curriculoAtualizado: [0],
      dataCurriculoAtualizado: [0],
      cursos: this.listarCursos(idAreaProfissional),
      semestre: '',
      cursando: [
        this.perfilSelecionado === 'E'
          ? 'PROGRESS'
          : this.formValores.get('nivel_ensino').get('periodo')
            ? this.formValores.get('nivel_ensino').get('periodo').value
            : ''
      ],
      dataPrevisaoCurso: '',
      periodo: [
        {
          value: {
            periodoManha: false,
            periodoTarde: false,
            periodoNoite: false,
            periodoIntegral: false
          }
        }
      ],
      distancia: '',
      opcoesDistancia: '',
      idioma: '',
      nivelIdioma: '',
      certificadoIdioma: '',
      idiomasSelecionados: '',
      conhecimento: '',
      nivelConhecimento: '',
      certificadoConhecimento: '',
      conhecimentosSelecionados: '',
      escolas: '',
      escolasSelecionadas: '',
      estadoCivil: [
        {
          value: {
            solteiro: true,
            casado: false,
            separado: false,
            divorciado: false,
            viuvo: false
          }
        }
      ],
      sexo: '',
      idade: [{ value: [14, 100] }],
      possuiVideo: false,
      possuiRedacao: false,
      possuiReservista: false
    });
  }

  public montarFiltroServico(): Filtro {
    let nivelEnsino,
      areaProfissional,
      sort,
      limiteDistancia,
      cursos,
      startSemestre,
      endSemestre,
      conclusaoCurso,
      // tslint:disable-next-line:prefer-const
      periodos,
      palavrasChaves,
      situacaoEscolaridade,
      sexo,
      estadoCivil,
      video,
      redacao,
      escolas,
      idiomas,
      conhecimentosTecnico,
      startIdade,
      endIdade,
      areaAtuacaoAprendiz,
      locaisCapacitacao,
      possuiReservista;

    if (this.filtros && this.filtros.value) {
      nivelEnsino = this.filtros.value.nivelEnsino
        ? this.filtros.value.nivelEnsino
        : '';
      areaProfissional = this.filtros.value.areaProfissional
        ? this.filtros.value.areaProfissional
        : '';
      sort = this.filtros.value.relevancia
        ? this.filtros.value.relevancia + ',ASC'
        : 'name,ASC';
      limiteDistancia = this.filtros.value.distancia
        ? this.filtros.value.distancia
        : '20';
      cursos = this.filtros.value.cursos
        ? this.filtros.value.cursos.filter(f => f.selecionado).map(m => m.id)
        : '';
      if (
        this.filtros.value.semestre &&
        this.filtros.value.semestre['length'] &&
        this.filtros.value.semestre[0] > 0
      ) {
        startSemestre = this.filtros.value.semestre[0];
        endSemestre = this.filtros.value.semestre[1];
      }
      if (this.filtros.value.cursando) {
        situacaoEscolaridade = [];
        if (this.filtros.value.cursando === 'BOTH') {
          situacaoEscolaridade.push('PROGRESS');
          situacaoEscolaridade.push('COMPLETED');
        } else {
          situacaoEscolaridade.push(this.filtros.value.cursando);
        }
      }
      conclusaoCurso = this.filtros.value.dataPrevisaoCurso ?
        moment(this.filtros.value.dataPrevisaoCurso).add(1, 'days').format('YYYY-MM-DD') :
        '';
      if (this.filtros.value.periodo) {
        periodos = [];
        if (this.filtros.value.periodo.periodoManha) {
          periodos.push('M');
        }
        if (this.filtros.value.periodo.periodoTarde) {
          periodos.push('T');
        }
        if (this.filtros.value.periodo.periodoNoite) {
          periodos.push('N');
        }
        if (this.filtros.value.periodo.periodoIntegral) {
          periodos.push('I');
        }
        if (periodos.length < 1) {
          periodos = null;
        }
      }
      if (
        this.filtros.value.palavraChave &&
        this.filtros.value.palavraChave.conteudo
      ) {
        palavrasChaves = {
          palavras: this.filtros.value.palavraChave.conteudo
            ? this.filtros.value.palavraChave.conteudo.map(m =>
              m.value ? m.value : m
            )
            : '',
          ondeBuscar:
            this.filtros.value.palavraChave.ondeBuscar === '1'
              ? this.filtros.value.palavraChave.camposEspecificos
              : this.filtros.value.palavraChave.ondeBuscar,
          todasPalavras: this.filtros.value.palavraChave.todasAsPalavras,
          palavrasExatas: this.filtros.value.palavraChave.palavrasExatas
        };
      }
      sexo = this.filtros.value.sexo;
      if (
        this.filtros.value.estadoCivil &&
        (this.backOfficeVagas || this.backOfficePCDVagas)
      ) {
        estadoCivil = [];
        if (
          this.filtros.value.estadoCivil.solteiro ||
          (this.filtros.value.estadoCivil.value &&
            this.filtros.value.estadoCivil.value.solteiro)
        ) {
          estadoCivil.push('SINGLE');
        }
        if (
          this.filtros.value.estadoCivil.casado ||
          (this.filtros.value.estadoCivil.value &&
            this.filtros.value.estadoCivil.value.casado)
        ) {
          estadoCivil.push('MARRIED');
        }
        if (
          this.filtros.value.estadoCivil.separado ||
          (this.filtros.value.estadoCivil.value &&
            this.filtros.value.estadoCivil.value.separado)
        ) {
          estadoCivil.push('SEPARATED');
        }
        if (
          this.filtros.value.estadoCivil.divorciado ||
          (this.filtros.value.estadoCivil.value &&
            this.filtros.value.estadoCivil.value.divorciado)
        ) {
          estadoCivil.push('DIVORCED');
        }
        if (
          this.filtros.value.estadoCivil.viuvo ||
          (this.filtros.value.estadoCivil.value &&
            this.filtros.value.estadoCivil.value.viuvo)
        ) {
          estadoCivil.push('WIDOWER');
        }
        if (estadoCivil.length < 1) {
          estadoCivil = null;
        }
      }
      video = this.filtros.value.possuiVideo;
      redacao = this.filtros.value.possuiRedacao;
      if (this.filtros.value.idiomasSelecionados) {
        idiomas = [];
        this.filtros.value.idiomasSelecionados.forEach(f => {
          idiomas.push(f);
        });
        if (idiomas.length < 1) {
          idiomas = null;
        }
      }
      if (this.filtros.value.conhecimentosSelecionados) {
        conhecimentosTecnico = [];
        this.filtros.value.conhecimentosSelecionados.forEach(f => {
          conhecimentosTecnico.push(f);
        });
        if (conhecimentosTecnico.length < 1) {
          conhecimentosTecnico = null;
        }
      }
      escolas = this.filtros.value.escolasSelecionadas
        ? this.filtros.value.escolasSelecionadas.map(f => Number.parseInt(f.id))
        : '';
      if (
        (this.filtros.value.idade || this.filtros.value.idade.value) &&
        (this.filtros.value.idade['length'] ||
          this.filtros.value.idade.value['length']) &&
        (this.backOfficeVagas || this.backOfficePCDVagas)
      ) {
        startIdade = this.filtros.value.idade.value
          ? this.filtros.value.idade.value[0]
          : this.filtros.value.idade[0];
        endIdade = this.filtros.value.idade.value
          ? this.filtros.value.idade.value[1]
          : this.filtros.value.idade[1];
      }
      areaAtuacaoAprendiz = this.filtros.value.areaAtuacaoAprendiz;
      locaisCapacitacao = this.filtros.value.locaisCapacitacao;
      possuiReservista = this.filtros.value.possuiReservista;
    }

    return new Filtro({
      perfil: this.retornarPerfil(this.perfilSelecionado),
      latitudeRef: this.latForm,
      longitudeRef: this.lngForm,
      nivelEscolaridade: nivelEnsino,
      areaProfissional: Number.parseInt(areaProfissional),
      sort: sort,
      limiteDistancia: Number.parseInt(limiteDistancia),
      cursos: cursos,
      startSemestre: startSemestre,
      endSemestre: endSemestre,
      conclusaoCurso: conclusaoCurso,
      situacaoEscolaridade: situacaoEscolaridade,
      periodos: periodos,
      palavrasChaves: palavrasChaves,
      sexo: sexo,
      estadoCivil: estadoCivil,
      video: video,
      redacao: redacao,
      idiomas: idiomas,
      conhecimentosTecnico: conhecimentosTecnico,
      escolas: escolas,
      startIdade: startIdade,
      endIdade: endIdade,

      areaAtuacao: areaAtuacaoAprendiz,
      locaisCapacitacao: locaisCapacitacao,
      possuiReservista: possuiReservista
    });
  }

  public aplicarFiltros() {
    this.analisadorIteracoes
      .avaliaContatoDiretoFiltro(
        this.obterListaCandidatos(this.montarFiltroServico()),
        this.montarFiltroServico()
      )
      .then(() => { })
      .catch(() => {
        this.chamaModal();
      });
  }

  public atualizarListaLCS() {
    this.listaLCS = this.cacheDataService.obterListaLCS();
  }

  favoritarCandidato(candidato: CartaoPesquisa): void {
    if (!this.accessControlService.hasToken()) {
      this.acessoRestrito.modalAcessoRestrito.mostrarModal();
    }
  }

  exibirFavoritos() {
    this.router.navigate(['/vagas/buscar-candidatos/candidatos-favoritos']);
  }

  /**
   * @name - Adicionar LCS
   * @description - Adicionar os itens selecionados à lista de LCS
   */
  adicionarLCS() {
    const that = this;
    this.listaCandidatosSelecionados.forEach(id => {
      // TODO: incluir selecionados na listLCS

      if (that.listaLCS.findIndex(x => x.id === id) === -1) {
        const index = this.listaCandidatos.findIndex(c => c.id === id);
        if (index !== -1) {
          that.cacheDataService.adicionarLCS(this.listaCandidatos[index]);
          this.atualizarListaLCS();
          that.listaCandidatos[index].selecionado = true;
        }
      }
    });
  }

  /**
   * @name - Atualizar Selecionados
   * @param event - Evento do chceckbox clicado no grid.
   * @param id - Nome do campo que será o identificador na lista de selecionados. Default('')
   * @description - Atualiza os itens selecionados, adicionando-os/removendo-os
   * à lista de candidatos selecionados no grid.
   */
  atualizarSelecionados(event, id: number = 0) {
    const eventTargetValue = id !== 0 ? id : Number(event.target.value);
    const indiceArray = this.listaCandidatosSelecionados.indexOf(
      eventTargetValue
    );

    if (event.target.checked) {
      if (indiceArray === -1) {
        this.listaCandidatosSelecionados.push(eventTargetValue);
      }
    } else {
      if (indiceArray !== -1) {
        this.listaCandidatosSelecionados.splice(indiceArray, 1);
      }
    }
  }

  /**
   * @name - Selecionar todos
   * @param event - Evento do chceckbox clicado no grid.
   * @description - Seleciona todos os itens do grid.
   */
  selecionarTodos(ev) {
    this.listaCandidatos.forEach(x => {
      x.selecionado = ev.target.checked;
      this.atualizarSelecionados(ev, x.id);
    });
  }

  /**
   * @name - Expandir Candidato
   * @param i - Posição de indice do candidato na lista de candidatos.
   * @param idCandidato - Id do candidato. Default(0).
   * @description - Expande os detalhes do candidato consumindo um.
   */
  expandirCandidato(i, idCandidato: number = 0) {
    this.exibirDetalhes = false;
    const aux = this.toggle[i];
    Object.keys(this.toggle).forEach(h => {
      this.toggle[h] = false;
    });
    this.toggle[i] = !aux;

    if (this.toggle[i]) {
      // Timeout FAKE (simular loading)
      setTimeout(() => {
        this.cartaoPesquisaService
          .obterDetalhesCandidato(idCandidato)
          .subscribe(resultado => {
            this.detalhesCandidato = resultado;
            this.exibirDetalhes = true;
          });
        this.exibirDetalhes = true;
      }, 2000);
    }
  }

  selecionarCandidato(candidato: CartaoPesquisa, abaSelecionados?: boolean): void {
    const index = this.listaLCS.findIndex(f => f.codigoNome === candidato.codigoNome);
    if (index !== -1) {
      this.cacheDataService.removerLCS(candidato);
      this.cacheDataService.removerCandidatoVaga(candidato);
    } else {
      this.cacheDataService.adicionarLCS(candidato);
    }
    this.atualizarListaLCS();

    if (abaSelecionados && !this.cacheDataService.obterListaLCS().length) {
      this.mostrarPainel(this.PainelAtivoEnum.Buscados);
    }
  }

  visualizarCandidato(candidato: CartaoPesquisa): void {
    if (this.accessControlService.hasToken()) {
      // adicionar a lista de selecionado (buraco negro)
      this.idCandidatoSelecionado = candidato.id;
      this.visualizarCV();
    } else {
      this.acessoRestrito.modalAcessoRestrito.mostrarModal();
    }
  }

  compararCandidato(candidato: CartaoPesquisa): void {
    if (candidato.comparando === true) {
      this.cacheDataService.removerCandidatoListaComparar(candidato);
      candidato.comparando = false;
      if (this.listaCandidatos.find(f => f.codigoNome === candidato.codigoNome)) {
        this.listaCandidatos.find(f => f.codigoNome === candidato.codigoNome).comparando = false;
      }
    } else {
      if (this.cacheDataService.adicionarListaCandidatosComparar(candidato)) {
        candidato.comparando = true;
        if (this.listaCandidatos.find(f => f.codigoNome === candidato.codigoNome)) {
          this.listaCandidatos.find(f => f.codigoNome === candidato.codigoNome).comparando = true;
        }
      } else {
        this.mensagemAviso = 'Máximo de 3 candidatos selecionados para comparação.';
      }
    }
    this.listaCandidatosComparar = [];
    this.listaCandidatosComparar = this.cacheDataService.obterListaCandidatoComparar();
  }

  chamaModal() {
    this.modalCapturaUsuarioComponent.modalCapturaUsuario.mostrarModal();
  }

  /**
   * @name - Carregar mais candidatos
   * @description - Carrega mais candidatos, e adiciona à lista da Candidatos
   */
  carregarMais() {
    this.carregandoMais = true;
    if (!this.ultimaPagina) {
      const proximaPagina = this.pagina + 1;
      const itensPorPagina = this.formPaginacao.get('itensPorPagina').value;

      const perfilSelecionado = this.retornarPerfil(this.perfil);
      this.listaCartoesService
        .obterListaCartoes(this.montarFiltroServico(), proximaPagina, itensPorPagina)
        .subscribe(
          resultadoCartoes => {
            for (let i = 0; i < resultadoCartoes.content.length; i++) {
              const element = resultadoCartoes.content[i];
              this.listaCandidatos.push(element);
            }

            this.visualizando += resultadoCartoes.numberOfElements;
            this.total = resultadoCartoes.totalElements;
            this.ultimaPagina = resultadoCartoes.last;
            this.pagina = resultadoCartoes.number;
            this.carregandoMais = false;
            this.atualizarPropriedadeCarrinho();
            this.atualizarPropriedadeComparando();
          },
          err => console.error('Erro: ', err)
        );
    }
  }

  mostrarPainel(nomePainel: PainelAtivo): void {
    this.painelAtivo = nomePainel;
    this.paddingBottomListaCards = '230px';
  }

  toggleParaAberturaVaga(candidato: CartaoPesquisa) {
    const candidatoIndex = this.cacheDataService.listaCandidatosVaga.findIndex(
      item => {
        return candidato.id === item.id;
      }
    );
    if (candidatoIndex >= 0) {
      this.cacheDataService.listaCandidatosVaga.splice(candidatoIndex, 1);
      candidato['selecionadoParaVaga'] = false;
    } else {
      this.cacheDataService.listaCandidatosVaga.push(candidato);
      candidato['selecionadoParaVaga'] = true;
    }
  }

  acaoBotao(): void {
    if (this.painelAtivo === PainelAtivo.Selecionados) {
      this.cacheDataService.limparSelecaoAberturaVagas();
      this.mostrarPainel(PainelAtivo.Buscados);
    } else if (this.painelAtivo === PainelAtivo.Buscados) {
      this.mostrarPainel(PainelAtivo.Selecionados)
    }
  }

  visualizarCV() {
    this.visualizarCVModal.mostrarModal();
  }

  fecharModalVisualizarCV() {
    this.visualizarCVModal.fechar(false);
  }

  abrirModalAberturaVaga() {
    this.acessoRestrito.modalAcessoRestrito.mostrarModal();
  }

}
