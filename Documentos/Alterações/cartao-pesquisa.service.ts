import { Injectable } from '@angular/core';
import { CieeService } from 'app/core/ciee.service';
import { Http, Response } from '@angular/http';
import { SessionService } from 'app/core/session/session.service';
import { CartaoPesquisa } from './cartao-pesquisa.model';
import { CartaoPesquisaSerializer } from './cartao-pesquisa.serializer';
import { Filtro } from 'app/core/ciee-vagas/gravador-filtros/filtro/filtro.model';
import { FiltroSerializer } from 'app/core/ciee-vagas/gravador-filtros/filtro/filtro.serializer';
import { ToastrService } from 'ngx-toastr';
import { ServicoBase } from 'app/core/servico-base.service';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs/Observable';

@Injectable()
export class CartaoPesquisaService extends ServicoBase<CartaoPesquisa> {

  constructor(
    http: HttpClient,
    sessionService: SessionService,
    toastrService: ToastrService
  ) {
    super(
      '/student/vagas/candidatos/pesquisar',
      http,
      sessionService,
      toastrService
    )
  }

  obterCandidatos(
    filtros: Filtro,
  ): Observable<CartaoPesquisa[]> {
    return super.criar(filtros, {}, {}, this.basePath)
      .map(response => response['content'] || response)
      .catch(err => this.handleError(err, this.sessionService));
  }

  /**
    * @name - Obter Candidato
    * @param idCandidato - Identificador do Candidato
    * @description - Obter candidato pelo identificador.
    */
  obterCandidatoPorId(
    idCandidato: number,
  ): Observable<CartaoPesquisa> {
    return super.criar({ id: idCandidato }, {}, {}, this.basePath)
      .map(response => response['content'] || response)
      .catch(err => this.handleError(err, this.sessionService));
  }

  /**
    * @name - Obter Detalhes do Candidato
    * @param idCandidato - Identificador do Candidato
    * @description - Obter detahles do candidato pelo identificador.
    */
  // TODO: Criar modelo de resposta dos detalhes do candidato
  obterDetalhesCandidato(
    idCandidato: number,
  ): Observable<CartaoPesquisa> {
    return super.criar({ id: idCandidato }, {}, {}, this.basePath)
      .map(response => response['content'] || response)
      .catch(err => this.handleError(err, this.sessionService));
  }

  favoritarCandidato(
    basePath = this.basePath,
    idCandidato: number,
    removerFavorito: boolean = false
  ): Observable<any> {
    return super.atualizar(
      { 'idCandidado': idCandidato, 'remover': removerFavorito },
      {},
      basePath
    )
      .catch(err => this.handleError(err, this.sessionService));
  }
}
