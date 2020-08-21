////////////////////////////////////////////////////////////////////////////////////////////////////
//                               This file is part of CosmoScout VR                               //
//      and may be used under the terms of the MIT license. See the LICENSE file for details.     //
//                        Copyright: (c) 2019 German Aerospace Center (DLR)                       //
////////////////////////////////////////////////////////////////////////////////////////////////////

#include "Plugin.hpp"

#include "../../../src/cs-core/GraphicsEngine.hpp"
#include "../../../src/cs-core/GuiManager.hpp"
#include "../../../src/cs-core/SolarSystem.hpp"
#include "../../../src/cs-core/TimeControl.hpp"
#include "../../../src/cs-utils/convert.hpp"
#include "../../../src/cs-utils/filesystem.hpp"

#include <VistaKernel/GraphicsManager/VistaSceneGraph.h>
#include <VistaKernel/VistaSystem.h>

// Include VESTEC nodes
#include "VestecNodes/CinemaDBNode.hpp"
#include "VestecNodes/CriticalPointsNode.hpp"
#include "VestecNodes/DiseasesSensorInputNode.hpp"
#include "VestecNodes/DiseasesSimulationNode.hpp"
#include "VestecNodes/PersistenceNode.hpp"
#include "VestecNodes/TextureRenderNode.hpp"
#include "VestecNodes/UncertaintyRenderNode.hpp"
#include "VestecNodes/WildFireSourceNode.hpp"

////////////////////////////////////////////////////////////////////////////////////////////////////

EXPORT_FN cs::core::PluginBase* create() {
  return new csp::vestec::Plugin;
}

////////////////////////////////////////////////////////////////////////////////////////////////////

EXPORT_FN void destroy(cs::core::PluginBase* pluginBase) {
  delete pluginBase;
}

////////////////////////////////////////////////////////////////////////////////////////////////////

// Init data dir
std::string csp::vestec::Plugin::dataDir;

////////////////////////////////////////////////////////////////////////////////////////////////////

namespace csp::vestec {

////////////////////////////////////////////////////////////////////////////////////////////////////

void from_json(const nlohmann::json& j, Plugin::Settings& o) {
  cs::core::Settings::deserialize(j, "vestec-topo-dir", o.mVestecDataDir);
  cs::core::Settings::deserialize(j, "vestec-fire-dir", o.mFireDir);
  cs::core::Settings::deserialize(j, "vestec-diseases-dir", o.mDiseasesDir);
  cs::core::Settings::deserialize(j, "vestec-server", o.mVestecServer);
}

////////////////////////////////////////////////////////////////////////////////////////////////////

void Plugin::init() {
  logger().info("[CSP::VESTEC::Initialize] CosmoScout VR Plugin for the VESTEC EU project");

  // Add the VESTEC tab to the sidebar
  mGuiManager->addPluginTabToSideBarFromHTML(
      "VESTEC", "whatshot", "../share/resources/gui/vestec_settings.html");

  mGuiManager->addCssToGui("third-party/css/jquery-ui.min.css");
  mGuiManager->addCssToGui("css/vestec.css");

  mGuiManager->addScriptToGuiFromJS("../share/resources/gui/third-party/js/alight.min.js");
  mGuiManager->addScriptToGuiFromJS("../share/resources/gui/third-party/js/jquery-ui.min.js");
  mGuiManager->addScriptToGuiFromJS("../share/resources/gui/third-party/js/d3-node-editor.js");
  mGuiManager->addScriptToGuiFromJS("../share/resources/gui/third-party/js/vtk_14.8.1.js");

  auto vestecNodeEditorHtml =
      cs::utils::filesystem::loadToString("../share/resources/gui/vestec_node_editor.html");
  mGuiManager->getGui()->callJavascript("CosmoScout.gui.addHtml", vestecNodeEditorHtml, "body");
  auto vestecIncidentHtml =
      cs::utils::filesystem::loadToString("../share/resources/gui/vestec_incident_window.html");
  mGuiManager->getGui()->callJavascript("CosmoScout.gui.addHtml", vestecIncidentHtml, "body");
  mGuiManager->getGui()->callJavascript("CosmoScout.gui.initDraggableWindows");

  mGuiManager->addScriptToGuiFromJS("../share/resources/gui/js/csp-vestec-node-editor.js");
  mGuiManager->addScriptToGuiFromJS("../share/resources/gui/js/vestec.js");
  mGuiManager->addScriptToGuiFromJS("../share/resources/gui/js/csp-vestec.js");
  mGuiManager->addScriptToGuiFromJS("../share/resources/gui/js/csp-vestec-incident-node.js");

  // Register a callback to toggle the node editor.
  std::string callback = "vestecNodeEditor.toggle";
  mGuiManager->getGui()->registerCallback(
      callback, "Toggles the Vestec Node Editor.", std::function([this]() {
        mGuiManager->getGui()->executeJavascript(
            "document.getElementById('csp-vestec-node-editor').classList.toggle('visible')");
      }));

  // Add a timeline button to toggle the node editor.
  mGuiManager->addTimelineButton("Toggle Vestec Node Editor", "dashboard", callback);

  // Read the plugin settings from the scene config
  mPluginSettings = mAllSettings->mPlugins.at("csp-vestec");

  // add anchor node and register to solar system
  mVestecTransform = std::make_shared<cs::scene::CelestialAnchorNode>(
      mSceneGraph->GetRoot(), mSceneGraph->GetNodeBridge(), "", "Earth", "IAU_Earth");
  mSolarSystem->registerAnchor(mVestecTransform);

  // Set the data dir which is used by other classes
  Plugin::dataDir = mPluginSettings.mVestecDataDir;

  // Initialize vestec flow editor
  m_pNodeEditor = new VNE::NodeEditor(mGuiManager->getGui());

  // TODO:Create the Node editor
  m_pNodeEditor->RegisterSocketType("CINEMA_DB");
  m_pNodeEditor->RegisterSocketType("POINT_ARRAY");
  m_pNodeEditor->RegisterSocketType("TEXTURES");
  m_pNodeEditor->RegisterSocketType("INCIDENT");

  // Register our node types for the flow editor
  m_pNodeEditor->RegisterNodeType(CinemaDBNode::GetName(), "Sources",
      [](cs::gui::GuiItem* webView, int id) { return new CinemaDBNode(webView, id); },
      [](VNE::NodeEditor* editor) { CinemaDBNode::Init(editor); });

  m_pNodeEditor->RegisterNodeType(WildFireSourceNode::GetName(), "Sources",
      [this](cs::gui::GuiItem* webView, int id) {
        return new WildFireSourceNode(mPluginSettings, webView, id);
      },
      [](VNE::NodeEditor* editor) { WildFireSourceNode::Init(editor); });

  m_pNodeEditor->RegisterNodeType(DiseasesSensorInputNode::GetName(), "Sources",
      [this](cs::gui::GuiItem* webView, int id) {
        return new DiseasesSensorInputNode(mPluginSettings, webView, id);
      },
      [](VNE::NodeEditor* editor) { DiseasesSensorInputNode::Init(editor); });

  m_pNodeEditor->RegisterNodeType(DiseasesSimulation::GetName(), "Sources",
      [this](cs::gui::GuiItem* webView, int id) {
        return new DiseasesSimulation(mPluginSettings, webView, id);
      },
      [](VNE::NodeEditor* editor) { DiseasesSimulation::Init(editor); });

  m_pNodeEditor->RegisterNodeType(PersistenceNode::GetName(), "Renderer",
      [](cs::gui::GuiItem* webView, int id) { return new PersistenceNode(webView, id); },
      [](VNE::NodeEditor* editor) { PersistenceNode::Init(editor); });

  m_pNodeEditor->RegisterNodeType(TextureRenderNode::GetName(), "Renderer",
      [this](cs::gui::GuiItem* webView, int id) {
        return new TextureRenderNode(mPluginSettings, webView, id, mSolarSystem.get(),
            mVestecTransform.get(), mGraphicsEngine.get());
      },
      [](VNE::NodeEditor* editor) { TextureRenderNode::Init(editor); });

  m_pNodeEditor->RegisterNodeType(CriticalPointsNode::GetName(), "Renderer",
      [this](cs::gui::GuiItem* webView, int id) {
        return new CriticalPointsNode(mPluginSettings, webView, id, mSolarSystem.get(),
            mVestecTransform.get(), mGraphicsEngine.get());
      },
      [](VNE::NodeEditor* editor) { CriticalPointsNode::Init(editor); });

  m_pNodeEditor->RegisterNodeType(UncertaintyRenderNode::GetName(), "Renderer",
      [this](cs::gui::GuiItem* webView, int id) {
        return new UncertaintyRenderNode(mPluginSettings, webView, id, mSolarSystem.get(),
            mVestecTransform.get(), mGraphicsEngine.get());
      },
      [](VNE::NodeEditor* editor) { UncertaintyRenderNode::Init(editor); });

  // Initialize the editor in HTML and JavaScript
  m_pNodeEditor->InitNodeEditor();

  mGuiManager->getGui()->callJavascript("CosmoScout.vestec.setServer", mPluginSettings.mVestecServer);

  logger().info("[CSP::VESTEC::Initialize] Done");
}

////////////////////////////////////////////////////////////////////////////////////////////////////

void Plugin::deInit() {
  mSolarSystem->unregisterAnchor(mVestecTransform);
  mSceneGraph->GetRoot()->DisconnectChild(mVestecTransform.get());
  delete m_pNodeEditor;
}

////////////////////////////////////////////////////////////////////////////////////////////////////

void Plugin::update() {
  auto  simTime = mTimeControl->pSimulationTime.get();
  float timeOfDay =
      cs::utils::convert::time::toPosix(simTime).time_of_day().total_milliseconds() / 1000.0;
  // Update plugin per frame
}

////////////////////////////////////////////////////////////////////////////////////////////////////

} // namespace csp::vestec
