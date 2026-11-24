import { useMemo, useRef } from "react";
import { toWorld } from "../geometry.ts";
import { WelcomeStudio } from "../SurfaceViews.tsx";
import type { CanvasWorldProps } from "./canvasWorldTypes.ts";
import { GroupsLayer } from "./layers/GroupsLayer.tsx";
import { NodesLayer } from "./layers/NodesLayer.tsx";
import { WireCanvasStage } from "./WireCanvasStage.tsx";
import { TemporaryWireLayer } from "./TemporaryWireLayer.tsx";
import { useCanvasPointerDispatcher } from "./CanvasPointerDispatcher.ts";
import { OverviewCanvasLayer } from "./OverviewCanvasLayer.tsx";
import { OverviewActiveOverlay, OverviewFocusProxy } from "./OverviewActiveOverlay.tsx";
import { buildOverviewScene } from "./overviewScene.ts";
import { EdgeTagsLayer } from "./layers/EdgeTagsLayer.tsx";
import { CanvasHudLayer, MarqueeOverlay } from "./layers/CanvasHudLayer.tsx";

export function CanvasWorld(props: CanvasWorldProps) {
  const overviewScene = useMemo(() => buildOverviewScene(props), [
    props.sceneNodes, props.cardBoxes, props.snapshot, props.edgeIndex,
    props.derivedStructure, props.childTree, props.keepExpandedIds, props.languageRevision,
  ]);
  const wirePointer = useCanvasPointerDispatcher(props, overviewScene);
  const groupBackgroundRef = useRef<HTMLCanvasElement>(null);
  const {
    doc,
    docRef,
    snapshot,
    bridge,
    routeName,
    setRouteName,
    prefs,
    displayedTheme,
    reducedMotion,
    view,
    vpSize,
    lod,
    paintArea,
    wireViewport,
    rasterScene,
    tool,
    setTool,
    spacePressed,
    isDragging,
    minimapOpen,
    setMinimapOpen,
    snapPreview,
    historyCount,
    futureCount,
    viewportRef,
    gridRef,
    cursorFxRef,
    cursorHaloRef,
    cursorLensRef,
    lensGridRef,
    cameraRef,
    worldRef,
    groupsLayerRef,
    zoomLabelRef,
    miniViewportRef,
    miniFrameRef,
    viewAnimToken,
    wheelTargetRef,
    preClickSelectionRef,
    pendingFocusRef,
    selection,
    setSelection,
    selectionNodeSet,
    selectedStructureId,
    setSelectedStructureId,
    editingNodeId,
    focusedCard,
    setHoveredEdgeId,
    connecting,
    gesture,
    contentIndex,
    nodesById,
    membersOf,
    groupPorts,
    edgeIndex,
    writeByEdge,
    visibleGroups,
    sceneNodes,
    minimapBoxes,
    keepExpandedIds,
    waitingAgentNodes,
    cardBoxes,
    branchScroll,
    onBranchScroll,
    fileInputDrafts,
    quoteState,
    derivedStructure,
    childTree,
    wireScene,
    wireLayouts,
    accessoryWires,
    exchanges,
    routingBoxes,
    routingBoxesById,
    activeHubLayout,
    staffWires,
    staffDrag,
    staffTip,
    staffTarget,
    isNodeVisible,
    edgeVisualState,
    renderNodeCard,
    edit,
    editNode,
    editEdge,
    createCanvasNode,
    startPan,
    selectNode,
    toggleNodeForm,
    stopNode,
    openNodeContextMenu,
    startMarquee,
    startGroupMove,
    startResize,
    startPortDrag,
    startInputEdgeDrag,
    startWaypointDrag,
    trackPointer,
    openQuickCreate,
    openGroupContextMenu,
    openAnchoredMenu,
    openInputHub,
    scheduleCloseInputHub,
    insertFanout,
    launchScope,
    revealNode,
    returnWindow,
    openTeam,
    animateView,
    fitView,
    performUndo,
    loadStarter,
    handleInstantiateTemplate,
    reportError,
    setInspectorOpen,
    setPayloadPeek,
    setExchangeModal,
    setSessionModal,
    setHelpModal,
  } = props;

  return (
    <>
      {/* Canvas Viewport */}
      <div
        ref={viewportRef}
        className={[
          "fs-viewport",
          routeName !== "canvas" ? "is-hidden" : "",
          tool === "hand" || spacePressed ? "pan-mode" : "",
          isDragging ? "is-dragging" : "",
          connecting
            ? `connecting ${connecting.anchor.direction === "in" ? "connecting-reverse" : `connecting-${connecting.kind}`}`
            : "",
        ]
          .filter(Boolean)
          .join(" ")}
        onPointerDown={(ev) => {
          const target = ev.target as HTMLElement;
          // Any press catches a gliding / flung view, like grabbing a moving sheet.
          viewAnimToken.current++;
          wheelTargetRef.current = null;
          if (ev.button === 2) return;
          if (wirePointer.pointerDown(ev)) return;
          if (
            target.closest(
              ".node, .fs-struct-card, .window-stub, .group-header, .composite, .edge-tag, .exchange-tag, .waypoint, .fs-input-satellite, .fs-hub-corridor, .fs-canvas-controls, .fs-minimap, .offscreen-indicator, .fs-welcome-card",
            )
          ) {
            return;
          }
          if (ev.detail === 1) {
            preClickSelectionRef.current = {
              nodes: [...selection.nodes],
              structureId: selectedStructureId,
            };
          }
          if (ev.button === 1 || spacePressed || tool === "hand") {
            startPan(ev);
          } else if (ev.shiftKey) {
            startMarquee(ev);
          } else {
            startPan(ev);
          }
        }}
        onPointerMove={wirePointer.pointerMove}
        onPointerLeave={wirePointer.pointerLeave}
        onPointerCancel={wirePointer.pointerCancel}
        onClick={wirePointer.click}
        onDoubleClick={(ev) => {
          if (wirePointer.doubleClick(ev)) return;
          const target = ev.target as HTMLElement;
          if (
            target.closest(
              ".node, .fs-struct-card, .fs-child-card, .window-stub, .workflow-group, .edge-hit, .edge-tag, .exchange-tag, .waypoint, .fs-input-satellite, .fs-hub-corridor, .fs-overview-actions, .fs-overview-port, .fs-canvas-controls, .fs-minimap, .offscreen-indicator, .fs-welcome-card, button",
            )
          )
            return;
          const vp = viewportRef.current;
          if (!vp) return;
          const created = createCanvasNode(
            "agent",
            toWorld(
              docRef.current.viewport,
              vp.getBoundingClientRect(),
              ev.clientX,
              ev.clientY,
            ),
            undefined,
            true,
          );
          pendingFocusRef.current = created.id;
        }}
        onContextMenu={(ev) => {
          if (wirePointer.contextMenu(ev)) return;
          const target = ev.target as HTMLElement;
          if (
            target.closest(
              ".node, .fs-struct-card, .fs-child-card, .window-stub, .workflow-group, .edge-hit, .edge-tag, .exchange-tag, .waypoint, .fs-overview-actions, .fs-overview-port, .fs-canvas-controls, .fs-minimap",
            )
          )
            return;
          ev.preventDefault();
          openQuickCreate({ x: ev.clientX, y: ev.clientY });
        }}
      >
        {/* Dot grid on its own layer: panning only translates it */}
        <div ref={gridRef} className="fs-grid" aria-hidden="true" />
        {/* Cursor light: halo + dot lens, under the cards so it lights only the floor */}
        <div ref={cursorFxRef} className="fs-cursor-fx" aria-hidden="true">
          <div ref={cursorHaloRef} className="fx-halo" />
          <div ref={cursorLensRef} className="fx-lens">
            <div ref={lensGridRef} className="fx-lens-grid" />
          </div>
        </div>
        <canvas ref={groupBackgroundRef} className="fs-group-background" aria-hidden="true" />
        <WireCanvasStage
          doc={doc} snapshot={snapshot} lod={lod} nodesById={nodesById}
          keepExpandedIds={keepExpandedIds} derivedStructure={derivedStructure}
          childTree={childTree} wireScene={wireScene} accessoryWires={accessoryWires}
          exchanges={exchanges} staffWires={staffWires} prefs={prefs}
          wireLayouts={wireLayouts} vpSize={vpSize} displayedTheme={displayedTheme}
          reducedMotion={reducedMotion} routeName={routeName} selection={selection}
          connecting={connecting} routingBoxes={routingBoxes} routingBoxesById={routingBoxesById}
          writeByEdge={writeByEdge}
        />
        <OverviewCanvasLayer
          backgroundRef={groupBackgroundRef} overviewScene={overviewScene}
          doc={doc} nodesById={nodesById} sceneNodes={sceneNodes} cardBoxes={cardBoxes}
          snapshot={snapshot} edgeIndex={edgeIndex} derivedStructure={derivedStructure} childTree={childTree}
          keepExpandedIds={keepExpandedIds} vpSize={vpSize} displayedTheme={displayedTheme} routeName={routeName}
          visibleGroups={visibleGroups} membersOf={membersOf} groupPorts={groupPorts}
          selectionNodeSet={selectionNodeSet} selectedStructureId={selectedStructureId} connecting={connecting} lod={lod}
          languageRevision={props.languageRevision}
        />
        {/* Transformed World */}
        <div
          className="fs-camera"
          data-raster={rasterScene || undefined}
          ref={cameraRef}
        >
          <div
            ref={worldRef}
            className={`fs-world ${lod ? "semantic-zoom" : ""}`}
            data-wire-routing={prefs.wireRouting}
          >
            <div
              className="fs-scene-clip"
              style={{
                left: paintArea.x,
                top: paintArea.y,
                width: paintArea.w,
                height: paintArea.h,
              }}
            >
              <div
                className="fs-scene-origin"
                data-wire-routing={prefs.wireRouting}
                style={{ left: -paintArea.x, top: -paintArea.y }}
              >
                {/* Groups Layer */}
                <GroupsLayer
                  doc={doc}
                  snapshot={snapshot}
                  lod={lod}
                  paintArea={paintArea}
                  groupsLayerRef={groupsLayerRef}
                  selection={selection}
                  connecting={connecting}
                  nodesById={nodesById}
                  membersOf={membersOf}
                  groupPorts={groupPorts}
                  visibleGroups={visibleGroups}
                  keepExpandedIds={keepExpandedIds}
                  editNode={editNode}
                  startGroupMove={startGroupMove}
                  startResize={startResize}
                  startPortDrag={startPortDrag}
                  startInputEdgeDrag={startInputEdgeDrag}
                  openGroupContextMenu={openGroupContextMenu}
                  launchScope={launchScope}
                />

                {/* Nodes Layer */}
                <NodesLayer
                  snapshot={snapshot}
                  bridge={bridge}
                  lod={lod}
                  keepExpandedIds={keepExpandedIds}
                  vpSize={vpSize}
                  reducedMotion={reducedMotion}
                  paintArea={paintArea}
                  rasterScene={rasterScene}
                  pendingFocusRef={pendingFocusRef}
                  setSelection={setSelection}
                  selectionNodeSet={selectionNodeSet}
                  selectedStructureId={selectedStructureId}
                  setSelectedStructureId={setSelectedStructureId}
                  editingNodeId={editingNodeId}
                  focusedCard={focusedCard}
                  connecting={connecting}
                  gesture={gesture}
                  contentIndex={contentIndex}
                  edgeIndex={edgeIndex}
                  sceneNodes={sceneNodes}
                  cardBoxes={cardBoxes}
                  branchScroll={branchScroll}
                  onBranchScroll={onBranchScroll}
                  fileInputDrafts={fileInputDrafts}
                  quoteState={quoteState}
                  derivedStructure={derivedStructure}
                  childTree={childTree}
                  activeHubLayout={activeHubLayout}
                  staffTarget={staffTarget}
                  renderNodeCard={renderNodeCard}
                  createCanvasNode={createCanvasNode}
                  returnWindow={returnWindow}
                  openTeam={openTeam}
                />

                {/* Edge Pill Tags & Waypoints Layer */}
                <EdgeTagsLayer
                  doc={doc}
                  bridge={bridge}
                  lod={lod}
                  rasterScene={rasterScene}
                  wireViewport={wireViewport}
                  selection={selection}
                  setSelection={setSelection}
                  setHoveredEdgeId={setHoveredEdgeId}
                  connecting={connecting}
                  nodesById={nodesById}
                  keepExpandedIds={keepExpandedIds}
                  wireLayouts={wireLayouts}
                  exchanges={exchanges}
                  activeHubLayout={activeHubLayout}
                  edgeVisualState={edgeVisualState}
                  editEdge={editEdge}
                  startInputEdgeDrag={startInputEdgeDrag}
                  startWaypointDrag={startWaypointDrag}
                  openAnchoredMenu={openAnchoredMenu}
                  openInputHub={openInputHub}
                  scheduleCloseInputHub={scheduleCloseInputHub}
                  revealNode={revealNode}
                  reportError={reportError}
                  setInspectorOpen={setInspectorOpen}
                  setPayloadPeek={setPayloadPeek}
                  setExchangeModal={setExchangeModal}
                  snapshot={snapshot}
                />

              </div>
            </div>
          </div>
        </div>

        <TemporaryWireLayer connecting={connecting} prefs={prefs} routingBoxes={routingBoxes}
          staffDrag={staffDrag} staffTip={staffTip} staffTarget={staffTarget} />
        <MarqueeOverlay />
        <OverviewActiveOverlay
          lod={lod} connecting={connecting} nodesById={nodesById} keepExpandedIds={keepExpandedIds}
          snapshot={snapshot} edgeIndex={edgeIndex} selectNode={selectNode} toggleNodeForm={toggleNodeForm}
          launchScope={launchScope} stopNode={stopNode} openNodeContextMenu={openNodeContextMenu}
          startInputEdgeDrag={startInputEdgeDrag} startPortDrag={startPortDrag}
        />
        <OverviewFocusProxy
          lod={lod} selection={selection} nodesById={nodesById} keepExpandedIds={keepExpandedIds}
          toggleNodeForm={toggleNodeForm} viewportRef={viewportRef}
        />
      </div>

      {/* Empty Canvas Welcome Card */}
      {routeName === "canvas" && doc.nodes.length === 0 && (
        <WelcomeStudio
          doc={doc}
          onSelectTemplate={(tpl) =>
            tpl.id === "builtin-review"
              ? loadStarter()
              : handleInstantiateTemplate(tpl)
          }
          onCreateBlankAgent={() => {
            const created = createCanvasNode("agent");
            pendingFocusRef.current = created.id;
          }}
          onBrowseLibrary={() => setRouteName("workflows")}
          onImportSession={() =>
            void bridge.sessions().then(setSessionModal).catch(reportError)
          }
        />
      )}

      {/* Offscreen Waiting Indicators */}
      <CanvasHudLayer
        doc={doc}
        docRef={docRef}
        snapshot={snapshot}
        routeName={routeName}
        displayedTheme={displayedTheme}
        view={view}
        vpSize={vpSize}
        lod={lod}
        rasterScene={rasterScene}
        tool={tool}
        setTool={setTool}
        minimapOpen={minimapOpen}
        setMinimapOpen={setMinimapOpen}
        historyCount={historyCount}
        futureCount={futureCount}
        viewportRef={viewportRef}
        zoomLabelRef={zoomLabelRef}
        miniViewportRef={miniViewportRef}
        miniFrameRef={miniFrameRef}
        minimapBoxes={minimapBoxes}
        keepExpandedIds={keepExpandedIds}
        waitingAgentNodes={waitingAgentNodes}
        isNodeVisible={isNodeVisible}
        trackPointer={trackPointer}
        revealNode={revealNode}
        animateView={animateView}
        fitView={fitView}
        performUndo={performUndo}
        setHelpModal={setHelpModal}
      />

      {/* Snap Preview Overlay & Floating Windows */}
      <div
        className={`snap-preview ${snapPreview ? `snap-${snapPreview}` : ""}`}
      />
      {routeName === "canvas" && (
        <div className="fs-floating-layer">
          {doc.nodes
            .filter((n) => !!n.window)
            .map((n) =>
              renderNodeCard(
                n,
                "window",
                snapshot,
                cardBoxes(n)[Number(lod)],
                undefined,
                undefined,
                undefined,
                0,
                {
                  selected: selectionNodeSet.has(n.id),
                  fileDraft:
                    n.kind === "file"
                      ? (fileInputDrafts[n.id] ?? "")
                      : undefined,
                  quoteText:
                    quoteState?.nodeId === n.id ? quoteState.text : undefined,
                },
              ),
            )}
        </div>
      )}
    </>
  );
}
