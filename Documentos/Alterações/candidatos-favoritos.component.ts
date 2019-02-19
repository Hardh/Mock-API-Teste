import { Component, OnInit, ViewChild } from '@angular/core';
import { CartaoPesquisa } from 'app/core/ciee-vagas/cartao/cartao-pesquisa.model';
import { CacheDataService } from 'app/core/ciee-vagas/cache-data/cache-data.service';
import { ListaCartoesService } from 'app/core/ciee-vagas/cartao/listagem-cartoes.service';
import { FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { UtilsService } from 'app/core/utils/utils.service';
import { ModalComponent } from 'app/ui/modal/modal/modal.component';
import { Page } from 'app/core/page.model';
import { CandidatoGerenciaService } from 'app/core/ciee-vagas/candidato/candidato-gerencia.service';
import { ComponentPaginaPadrao } from 'app/ui/page/component-pagina-padrao';
import { PermissionService } from 'app/core/ciee-permission/permission.service';
import { AccessControlService } from 'app/core/access-control/access-control.service';
import { BsModalService } from 'ngx-bootstrap';

@Component({
  selector: 'app-candidatos-favoritos',
  templateUrl: './candidatos-favoritos.component.html',
  styleUrls: ['./candidatos-favoritos.component.scss']
})
export class CandidatosFavoritosComponent extends ComponentPaginaPadrao implements OnInit {

  @ViewChild('visualizarCVModal') visualizarCVModal: ModalComponent;

  carregando = false;
  tipoVisualizacao = 'CARTOES';
  listaFavoritos: CartaoPesquisa[] = [];
  numeroFavoritos = 0;
  pagina = 0;
  qntPaginas: number;
  paginas: number[] = [];
  mensagemErro = '';
  mensagemAviso = '';
  perfil = 'E';
  formPaginacao: FormGroup;
  idCandidatoSelecionado: number;
  tipoUsuarioLogado: string;
  public listaCandidatosComparar: CartaoPesquisa[] = [];

  constructor(
    private cacheDataService: CacheDataService,
    private listaCartoesService: ListaCartoesService,
    private fbPaginacao: FormBuilder,
    private accessControlService: AccessControlService,
    private permissionService: PermissionService,
    private candidatoGerenciaService: CandidatoGerenciaService,
    private utilsService: UtilsService,
    private modalService: BsModalService
  ) {
    super(modalService);
  }

  ngOnInit() {
    this.formPaginacao = this.fbPaginacao.group({
      itensPorPagina: new FormControl('20'),
      pagina: new FormControl('0')
    });
    this.obterFavoritos();
    this.atualizarPermissoes();
  }

  atualizarPermissoes() {
    // tslint:disable:no-unused-expression
    this.tipoUsuarioLogado = null;
    if (this.accessControlService.hasToken()) {
      this.permissionService.temPermissao('vag_bo_pcd') ? this.tipoUsuarioLogado = 'backOfficePCDVagas' : null;
      this.permissionService.temPermissao('vag_emp') ? this.tipoUsuarioLogado = 'backOfficeEmpresa' : null;
      this.permissionService.temPermissao('vag_bo') ? this.tipoUsuarioLogado = 'backOfficeVagas' : null;
      (
        this.permissionService.temPermissao('vag_bo_pcd')
        && this.permissionService.temPermissao('vag_emp')
        && this.permissionService.temPermissao('vag_bo')
      ) ? this.tipoUsuarioLogado = 'admin' : null;
    }
    // tslint:enable:no-unused-expression
  }

  obterFavoritos() {
    this.carregando = true;
    const page = new Page({
      size: this.formPaginacao.get('itensPorPagina').value,
      sort: `name,ASC`,
      // TODO: O modo correto é o abaixo mas ao enviar para o BACK está adicionando o seguinte 'sort=name,ASC%26code,ASC'
      // sort: `name,ASC&code,ASC`,
      pageNumber: this.formPaginacao.get('pagina').value
    })

    this.listaCartoesService.obterFavoritosPaginado(page)
      .finally(() => this.carregando = false)
      .subscribe(resultadoCartoes => {
        this.listaFavoritos = resultadoCartoes.data;
        this.cacheDataService.preencherListaFavoritos(this.listaFavoritos);
        this.pagina = resultadoCartoes.number;
        this.qntPaginas = resultadoCartoes.totalPages;
        for (let i = 1; i <= this.qntPaginas; i++) {
          this.paginas.push(i);
        }
      }, (err) => {
        this.mensagemErro = this.utilsService.parseErrorMessage(err);
      });

  }

  /**
  * @name - Mudar Visualização
  * @description - Muda a visualização cartões/lista.
  */
  mudarVisualizacao(tipoVisualizacao) {
    this.tipoVisualizacao = tipoVisualizacao;
  }

  proximaPagina() {
    this.pagina = this.formPaginacao.get('pagina').value;
    this.pagina++;
    if (this.pagina <= this.qntPaginas) {
      this.obterFavoritos();
      this.formPaginacao.get('pagina').value(this.pagina);
    }
  }

  paginaAnterior() {
    this.pagina = this.formPaginacao.get('pagina').value;
    this.pagina--;
    if (this.pagina >= 0) {
      this.obterFavoritos();
      this.formPaginacao.get('pagina').value(this.pagina);
    }
  }

  mudarPagina(event) {
    this.pagina = this.formPaginacao.get('pagina').value;
    if (this.pagina >= 0 || this.pagina <= this.qntPaginas) {
      this.obterFavoritos();
      this.formPaginacao.get('pagina').value(this.pagina);
    }
  }

  mudarItensPagina(event: MouseEvent) {
    event.preventDefault();
    this.formPaginacao.get('itensPorPagina').setValue(
      event.target['value']
    );
    this.obterFavoritos();
  }

  favoritarCandidato(candidato: CartaoPesquisa): void {
    if (this.accessControlService.hasToken()) {
      this.candidatoGerenciaService.desFavoritar(candidato.id)
        .finally(() => this.carregando = false)
        .subscribe(() => {
          this.cacheDataService.adicionarFavoritos(candidato);
          this.formPaginacao.get('pagina').value(0);
          this.obterFavoritos()
        }, er => {
          this.mensagemErro = this.utilsService.parseErrorMessage(er);
        })
    }
  }

  selecionarCandidato(candidato: CartaoPesquisa): void {
    const index = this.cacheDataService.obterListaLCS().findIndex(f => f.codigoNome === candidato.codigoNome);
    if (index !== -1) {
      this.cacheDataService.removerLCS(candidato);
      this.cacheDataService.removerCandidatoVaga(candidato);
    } else {
      this.cacheDataService.adicionarLCS(candidato);
    }
  }

  compararCandidato(candidato: CartaoPesquisa): void {
    if (candidato.comparando === true) {
      this.cacheDataService.removerCandidatoListaComparar(candidato);
      candidato.comparando = false;
      if (this.listaFavoritos.find(f => f.codigoNome === candidato.codigoNome)) {
        this.listaFavoritos.find(f => f.codigoNome === candidato.codigoNome).comparando = false;
      }
    } else {
      if (this.cacheDataService.adicionarListaCandidatosComparar(candidato)) {
        candidato.comparando = true;
        if (this.listaFavoritos.find(f => f.codigoNome === candidato.codigoNome)) {
          this.listaFavoritos.find(f => f.codigoNome === candidato.codigoNome).comparando = true;
        }
      } else {
        this.mensagemAviso = 'Máximo de 3 candidatos selecionados para comparação.';
      }
    }
    this.listaCandidatosComparar = [];
    this.listaCandidatosComparar = this.cacheDataService.obterListaCandidatoComparar();
  }

  visualizarCandidato(candidato: CartaoPesquisa): void {
    if (this.accessControlService.hasToken()) {
      this.idCandidatoSelecionado = candidato.id;
      this.visualizarCV();
    }
  }

  visualizarCV() {
    this.visualizarCVModal.mostrarModal();
  }

  fecharModalVisualizarCV() {
    this.visualizarCVModal.fechar(false);
  }
}
